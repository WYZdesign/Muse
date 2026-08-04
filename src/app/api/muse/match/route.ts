import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const COLLECTION = "muse_embeddings";

/**
 * Muse Recommendations API — AI-powered matching.
 * Combines Qdrant cosine similarity with rules-based scoring.
 * GET /api/muse/match?limit=20&offset=0
 * POST /api/muse/match { action: "recommend", limit: 20 }
 */
export async function GET(req: NextRequest) {
  try {
    const header = req.headers.get("authorization") || "";
    const bearer = header.replace(/^Bearer\s+/i, "").trim();
    if (!bearer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: authData } = await supabase.auth.getUser(bearer);
    if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = getServiceClient();
    const { data: profile } = await sb.from("muse_profiles")
      .select("id, name, type, bio, styles, looking, zodiac, chinese, mbti, life_path, avatar, loc, tier")
      .eq("auth_id", authData.user.id).maybeSingle();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

    // Fetch all profiles (visible to this user)
    const { data: allProfiles } = await sb.from("muse_profiles")
      .select("id, name, type, bio, styles, looking, zodiac, chinese, mbti, life_path, avatar, loc, photos, collabs, verified, tier, profile_completion_pct")
      .limit(200);

    const candidates = (allProfiles || []).filter((p: any) => {
      if (String(p.id) === String(profile.id)) return false;
      const hasAvatar = typeof p.avatar === "string" && p.avatar.trim().length > 0;
      const hasPhotos = Array.isArray(p.photos) && p.photos.length > 0;
      return hasAvatar || hasPhotos;
    });

    // ── Step 1: Try Qdrant cosine similarity ──
    let qdrantScores: Record<string, number> = {};
    try {
      // Get user's embedding
      const pointId = hashToUint64(`profile:${profile.id}`);
      const embResp = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/${pointId}`);
      if (embResp.ok) {
        const embData = await embResp.json();
        const userVector = embData.result?.vector;
        if (userVector?.length === 768) {
          // Search for similar profiles
          const searchResp = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vector: userVector,
              limit: 50,
              score_threshold: 0.3,
              with_payload: { include: ["user_id"] },
            }),
          });
          if (searchResp.ok) {
            const searchData = await searchResp.json();
            for (const hit of searchData.result || []) {
              const uid = hit.payload?.user_id;
              if (uid) qdrantScores[uid] = hit.score;
            }
          }
        }
      }
    } catch { /* Qdrant may be down — fallback to rules only */ }

    // ── Step 2: Rules-based scoring (matching calcMatch logic) ──
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

      // ── Step 3: Combine scores ──
      const qdrantScore = qdrantScores[c.id] || 0;
      // Weight: 60% rules + 40% cosine similarity (normalized to 0-100)
      const cosineNorm = Math.round(qdrantScore * 100);
      const combined = Math.round(rules * 0.6 + cosineNorm * 0.4);

      return {
        ...c,
        rulesScore: rules,
        cosineScore: cosineNorm,
        matchScore: Math.min(combined, 99),
        hasEmbedding: qdrantScore > 0,
      };
    });

    // Sort by combined score descending
    scored.sort((a: any, b: any) => b.matchScore - a.matchScore);

    // Paginate
    const paginated = scored.slice(offset, offset + limit);

    return NextResponse.json({
      profiles: paginated,
      total: scored.length,
      offset,
      limit,
      qdrantHits: Object.keys(qdrantScores).length,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

function hashToUint64(str: string): number {
  let hash = BigInt("0xcbf29ce484222325");
  const prime = BigInt("0x100000001b3");
  const mask = BigInt("0xffffffffffffffff");
  const positiveMask = BigInt("0x7fffffffffffffff");
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return Number(hash & positiveMask);
}
