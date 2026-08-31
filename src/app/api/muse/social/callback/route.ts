import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { getMuseUrl } from "@/lib/urls";

export const runtime = "nodejs";

const OAUTH_CONFIG = {
  instagram: {
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/muse/social/callback?provider=instagram`,
  },
  facebook: {
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/muse/social/callback?provider=facebook`,
  },
  spotify: {
    tokenUrl: "https://accounts.spotify.com/api/token",
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/muse/social/callback?provider=spotify`,
  },
  soundcloud: {
    tokenUrl: "https://secure.soundcloud.com/oauth/token",
    clientId: process.env.SOUNDCLOUD_CLIENT_ID,
    clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/muse/social/callback?provider=soundcloud`,
  },
};

async function exchangeCodeForToken(provider: string, code: string) {
  const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG];
  if (!config || !config.clientId || !config.clientSecret) return null;

  const params = new URLSearchParams({
    client_id: config.clientId!,
    client_secret: config.clientSecret!,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[${provider}] token exchange failed:`, err);
    return null;
  }

  return res.json();
}

async function fetchUserInfo(provider: string, accessToken: string) {
  const endpoints: Record<string, string> = {
    instagram: "https://graph.instagram.com/me?fields=id,username,account_type,media_count",
    facebook: "https://graph.facebook.com/me?fields=id,name,email,picture",
    spotify: "https://api.spotify.com/v1/me",
    soundcloud: "https://api.soundcloud.com/me.json",
  };

  const url = endpoints[provider];
  if (!url) return null;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (!provider) return NextResponse.redirect(`${getMuseUrl()}?error=provider_missing`);
    if (error) return NextResponse.redirect(`${getMuseUrl()}?error=${error}`);

    if (!code || !state) {
      return NextResponse.redirect(`${getMuseUrl()}?error=invalid_callback`);
    }

    let stateData: { profileId: string; provider: string; ts: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      return NextResponse.redirect(`${getMuseUrl()}?error=invalid_state`);
    }

    if (stateData.provider !== provider) {
      return NextResponse.redirect(`${getMuseUrl()}?error=provider_mismatch`);
    }

    if (Date.now() - stateData.ts > 10 * 60 * 1000) {
      return NextResponse.redirect(`${getMuseUrl()}?error=state_expired`);
    }

    const tokenData = await exchangeCodeForToken(provider, code);
    if (!tokenData?.access_token) {
      return NextResponse.redirect(`${getMuseUrl()}?error=token_exchange_failed`);
    }

    const userInfo = await fetchUserInfo(provider, tokenData.access_token);

    const sb = getServiceClient();

    await sb.from("muse_social_connections").upsert({
      user_id: stateData.profileId,
      provider,
      provider_user_id: userInfo?.id || userInfo?.user_id || "unknown",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      username: userInfo?.username || userInfo?.display_name || userInfo?.name || null,
      profile_url: userInfo?.profile_url || userInfo?.external_urls?.spotify || null,
      scope: tokenData.scope || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/muse/settings?connected=${provider}`);
  } catch (e: unknown) {
    console.error("[social callback] failed:", e);
    return NextResponse.redirect(`${getMuseUrl()}?error=server_error`);
  }
}