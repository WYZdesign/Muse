import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

const OAUTH_CONFIG = {
  instagram: {
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/muse/social/callback?provider=instagram`,
    scopes: ["user_profile", "user_media"],
  },
  facebook: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/muse/social/callback?provider=facebook`,
    scopes: ["public_profile", "instagram_basic", "instagram_content_publish"],
  },
  spotify: {
    authUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/muse/social/callback?provider=spotify`,
    scopes: ["user-read-private", "user-read-email", "user-top-read"],
  },
  soundcloud: {
    authUrl: "https://secure.soundcloud.com/oauth/authorize",
    tokenUrl: "https://secure.soundcloud.com/oauth/token",
    clientId: process.env.SOUNDCLOUD_CLIENT_ID,
    clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/muse/social/callback?provider=soundcloud`,
    scopes: ["*"],
  },
};

function getProviderConfig(provider: string) {
  const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG];
  if (!config) return null;
  if (!config.clientId || !config.clientSecret) return null;
  return config;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    const action = url.searchParams.get("action") || "auth";

    if (!provider) return NextResponse.json({ error: "Provider required" }, { status: 400 });

    const config = getProviderConfig(provider);
    if (!config) return NextResponse.json({ error: `${provider} OAuth not configured` }, { status: 503 });

    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    let profileId: string | null = null;
    if (bearer) {
      const { data: authData } = await supabase.auth.getUser(bearer);
      if (authData.user) {
        const sb = getServiceClient();
        const { data: prof } = await sb.from("muse_profiles").select("id").eq("auth_id", authData.user.id).maybeSingle();
        profileId = prof?.id ?? null;
      }
    }
    if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (action === "auth") {
      const state = Buffer.from(JSON.stringify({ profileId, provider, ts: Date.now() })).toString("base64url");
      const params = new URLSearchParams({
        client_id: config.clientId!,
        redirect_uri: config.redirectUri,
        scope: config.scopes.join(" "),
        response_type: "code",
        state,
      });
      const authUrl = `${config.authUrl}?${params.toString()}`;
      return NextResponse.redirect(authUrl);
    }

    if (action === "disconnect") {
      const sb = getServiceClient();
      await sb.from("muse_social_connections").delete().eq("user_id", profileId).eq("provider", provider);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    console.error("[social oauth] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}