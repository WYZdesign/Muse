import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { isIndustryType } from "@/lib/role";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { embedText, cosineSimilarity, aiEnabled } from "@/lib/ai";

/**
 * Muse Recommendations API — AI-powered matching.
 * Cost model: reads STORED embeddings (no per-request embedding) and computes
 * cosine similarity in JS (free). A profile is embedded once (lazily, on first
 * match request) and cached in muse_profiles.embedding.
 *
 * GET /api/muse/match?limit=20&offset=0
 */

function profileEmbedText(p: Record<string, unknown>): string {
  const parts: string[] = [];
  if (p.name) parts.push(`Name: ${p.name}`);
  if (p.type) parts.push(`Creative type: ${p.type}`);
  if (p.bio) parts.push(`Bio: ${p.bio}`);
  if (Array.isArray(p.styles) && p.styles.length) parts.push(`Styles: ${p.styles.join(", ")}`);
  if (Array.isArray(p.looking) && p.looking.length) parts.push(`Looking for: ${p.looking.join(", ")}`);
  if (p.loc) parts.push(`Location: ${p.loc}`);
  return parts.join("\n").trim();
}

export async function GET(req: NextRequest) {
  try {
    if (!await checkRate(clientIp(req), "match", 30)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    const header = req.headers.get("authorization") || "";
    const bearer = header.replace(/^Bearer\s+/i, "").trim();
    if (!bearer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: authData } = await supabase.auth.getUser(bearer);
    if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = getServiceClient();
    const { data: profile } = await sb.from("muse_profiles")
      .select("id, name, type, bio, styles, looking, zodiac, chinese, mbti, life_path, avatar, loc, tier, embedding")
      .eq("auth_id", authData.user.id).maybeSingle();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

    // Fetch candidates WITH their stored embeddings (single read, no token cost).
    const { data: allProfiles } = await sb.from("muse_profiles")
      .select("id, name, type, bio, styles, looking, zodiac, chinese, mbti, life_path, avatar, loc, photos, collabs, verified, tier, profile_completion_pct, embedding, preferences, nsfw")
      .limit(200);

    // Blocks (either direction) were never consulted here — the swipe deck could
    // surface a profile that blocked the viewer or vice versa. Mirrors the same
    // lookup used for the generic type=profiles listing in route.ts.
    const { data: blocks } = await sb.from("muse_blocks").select("user_id, target_id").or(`user_id.eq.${profile.id},target_id.eq.${profile.id}`);
    const blockedIds = new Set((blocks || []).map((b: any) => (String(b.user_id) === String(profile.id) ? String(b.target_id) : String(b.user_id))));

    const candidates = (allProfiles || []).filter((p: any) => {
      if (String(p.id) === String(profile.id)) return false;
      if (blockedIds.has(String(p.id))) return false;
      if (p.suspended) return false;
      const hasAvatar = typeof p.avatar === "string" && p.avatar.trim().length > 0;
      const hasPhotos = Array.isArray(p.photos) && p.photos.length > 0;
      return hasAvatar || hasPhotos;
    });

    // ── User embedding: use cached, else lazily embed once and persist ──
    let userVector: number[] | null = Array.isArray(profile.embedding) && (profile.embedding as number[]).length > 0
      ? (profile.embedding as number[])
      : null;

    if (!userVector && aiEnabled()) {
      const text = profileEmbedText(profile as Record<string, unknown>);
      userVector = await embedText(text);
      if (userVector) {
        // Persist so future requests are free (read-only).
        await sb.from("muse_profiles").update({ embedding: userVector, embedding_model: "openrouter", embedded_at: new Date().toISOString() }).eq("id", profile.id);
      }
    }

    // ── Cosine similarity against cached candidate vectors (free) ──
    const cosineScores: Record<string, number> = {};
    if (userVector) {
      for (const c of candidates) {
        const cv: number[] | null = Array.isArray(c.embedding) ? (c.embedding as number[]) : null;
        if (cv && cv.length === userVector.length) {
          cosineScores[c.id] = cosineSimilarity(userVector, cv);
        }
      }
    }

    // ── Rules-based scoring (zodiac/MBTI/life-path compatibility) ──
    const zCompat: Record<string, string[]> = {
      "Aries":["Leo","Sagittarius","Gemini","Aquarius"],"Taurus":["Virgo","Capricorn","Cancer","Pisces"],
      "Gemini":["Libra","Aquarius","Aries","Leo"],"Cancer":["Scorpio","Pisces","Taurus","Virgo"],
      "Leo":["Aries","Sagittarius","Gemini","Libra"],"Virgo":["Taurus","Capricorn","Cancer","Scorpio"],
      "Libra":["Gemini","Aquarius","Aries","Sagittarius"],"Scorpio":["Cancer","Pisces","Taurus","Capricorn"],
      "Sagittarius":["Aries","Leo","Gemini","Libra"],"Capricorn":["Taurus","Virgo","Cancer","Scorpio"],
      "Aquarius":["Gemini","Libra","Aries","Sagittarius"],"Pisces":["Cancer","Scorpio","Taurus","Virgo"],
    };
    const mCompat: Record<string, string[]> = {
      "INTJ":["ENTP","ENFP"],"INTP":["ENTJ","ENFJ"],"ENTJ":["INTP","INFP"],"ENTP":["INTJ","INFJ"],
      "INFJ":["ENFP","ENTP"],"INFP":["ENFJ","ENTJ"],"ENFJ":["INFP","INTP"],"ENFP":["INFJ","INTJ"],
      "ISTJ":["ESFP","ESTP"],"ISFJ":["ESFP","ESTP"],"ESTJ":["ISFP","ISTP"],"ESFJ":["ISFP","ISTP"],
      "ISTP":["ESFJ","ESTJ"],"ISFP":["ESFJ","ESTJ"],"ESTP":["ISTJ","ISFJ"],"ESFP":["ISTJ","ISFJ"],
    };

    const scored = candidates.map((c: any) => {
      let rules = 40;
      const shared = (profile.styles || []).filter((s: string) => c.styles?.includes(s));
      rules += Math.min(shared.length * 7, 21);
      if ((profile.looking || []).some((l: string) => c.looking?.some((bl: string) => bl.toLowerCase().includes(l.toLowerCase()) || l.toLowerCase().includes(bl.toLowerCase())))) rules += 15;
      if ((profile.looking || []).some((l: string) => c.type?.toLowerCase().includes(l.toLowerCase()))) rules += 8;
      if (profile.zodiac && c.zodiac) { if (profile.zodiac === c.zodiac) rules += 6; else if (zCompat[profile.zodiac]?.includes(c.zodiac)) rules += 4; }
      if (profile.chinese && c.chinese && profile.chinese === c.chinese) rules += 6;
      if (profile.mbti && c.mbti) { if (profile.mbti === c.mbti) rules += 5; else if (mCompat[profile.mbti]?.includes(c.mbti)) rules += 4; }
      if (profile.life_path && c.life_path && profile.life_path === c.life_path) rules += 5;
      if (c.verified) rules += 3;
      if (c.collabs > 50) rules += 2;
      rules = Math.min(rules, 99);

      const cosineRaw = cosineScores[c.id] || 0;
      const cosineNorm = Math.round(cosineRaw * 100);
      const combined = Math.round(rules * 0.6 + cosineNorm * 0.4);

      return {
        ...c,
        embedding: undefined,
        // Respect the candidate's own "Show Distance" privacy preference —
        // don't leak their full preferences blob, just the one derived flag
        // the client needs to decide whether to render a distance figure.
        preferences: undefined,
        showDistance: c.preferences?.showDistance !== false,
        // Duality P2 — which side of the marketplace this candidate is on,
        // so the client can orient discovery (industry = hiring, creative =
        // for-hire/collab) without exposing the raw type taxonomy.
        side: isIndustryType(c.type) ? "industry" : "creative",
        rulesScore: rules,
        cosineScore: cosineNorm,
        matchScore: Math.min(combined, 99),
        hasEmbedding: cosineRaw > 0,
      };
    });

    scored.sort((a: any, b: any) => b.matchScore - a.matchScore);
    const paginated = scored.slice(offset, offset + limit);

    return NextResponse.json({
      profiles: paginated,
      total: scored.length,
      offset,
      limit,
      aiEnabled: aiEnabled(),
      vectorMatches: Object.keys(cosineScores).length,
    });
  } catch (e: unknown) {
    console.error("[match] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
