// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — PREFERENCES, SYNC, PAYMENTS & SEARCH
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// The last small cluster of standalone POST actions not tied to any of the
// bigger domains: save-preferences, apply-promo, mark-read, sync,
// get-payments, search. Handlers are exported functions; the monolith's
// ACTIONS registry still dispatches them under the same action names, so the
// POST URL and every frontend call site are UNCHANGED. Pure relocation — no
// behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { checkRate, checkRateUser } from "@/lib/rate-limit";
import { UUID_RE, isAdminEmail, NextResponse, safeServerError, type ActionContext } from "./shared";

export const preferencesSave = async ({ sb, profile, rest }: ActionContext) => {
  const ALLOWED_PREFS = new Set([
    "nsfw", "showOnline", "showDistance", "notifications", "emailNotifications",
    "pushNotifications", "soundEffects", "darkMode", "distance", "ageRange",
    "openToTravel", "autoReply", "privacy", "visibility", "tags",
    "ageMin", "ageMax", "gender",
    "onboardingStep",
    "filterStyles", "filterScore",
    "savedBriefs",
    "appliedBriefs",
  ]);
  const source = (rest.preferences && typeof rest.preferences === "object") ? rest.preferences : rest;
  const prefs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
    if (ALLOWED_PREFS.has(k)) prefs[k] = v;
  }
  if (Object.keys(prefs).length === 0) return NextResponse.json({ error: "No valid preferences provided" }, { status: 400 });
  const { data: existing } = await sb.from("muse_profiles").select("preferences").eq("id", profile.id).maybeSingle();
  const merged = { ...(existing?.preferences || {}), ...prefs };
  const { error } = await sb.from("muse_profiles").update({ preferences: merged }).eq("id", profile.id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

export const promoApply = async ({ sb, profile, rest }: ActionContext) => {
  if (!await checkRateUser(profile.id, "apply-promo", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const code = String(rest.code || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Promo code required" }, { status: 400 });
  if (!isAdminEmail(profile.email)) return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });
  if (code !== "MUSEBETA") return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });
  const { error } = await sb.from("muse_profiles").update({ tier: "muse_pro" }).eq("id", profile.id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true, tier: "muse_pro" });
};

export const notificationsMarkRead = async ({ sb, profile, rest }: ActionContext) => {
  const { notificationIds } = rest;
  if (Array.isArray(notificationIds) && notificationIds.length > 0) {
    const ids = notificationIds.slice(0, 100).filter((x: unknown) => typeof x === "string" && UUID_RE.test(String(x)));
    if (ids.length > 0) {
      await sb.from("muse_notifications").update({ read: true }).in("id", ids).eq("user_id", profile.id);
    }
  }
  return NextResponse.json({ success: true });
};

export const clientSync = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "sync", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const results: string[] = [];
  if (rest.matches?.length) {
    for (const m of rest.matches as any[]) {
      await sb.from("muse_matches").upsert(
        { user_id: profile.id, target_id: m.id, matched_at: new Date().toISOString() },
        { onConflict: "user_id,target_id", ignoreDuplicates: true }
      );
    }
    results.push("matches");
  }
  if (rest.stats && typeof rest.stats === "object") {
    const allowedStatKeys = ["likes", "superLikes", "passes", "bookingsCompleted", "matchesReceived", "messagesSent"];
    const cleanStats: Record<string, number> = {};
    for (const k of allowedStatKeys) {
      const v = (rest.stats as Record<string, unknown>)[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) cleanStats[k] = Math.min(Math.floor(v), 100000);
    }
    if (Object.keys(cleanStats).length > 0) {
      const { data: existing } = await sb.from("muse_profiles").select("stats").eq("id", profile.id).maybeSingle();
      const merged = { ...(existing?.stats || {}), ...cleanStats };
      await sb.from("muse_profiles").update({ stats: merged }).eq("id", profile.id);
      results.push("stats");
    }
  }
  return NextResponse.json({ success: true, synced: results });
};

export const paymentsGet = async ({ sb, profile }: ActionContext) => {
  const { data: asPayee } = await sb.from("muse_booking_payments").select("*, payer_id(name, avatar), payee_id(name, avatar), booking_id(session_id, status)")
    .eq("payee_id", profile.id).order("created_at", { ascending: false }).limit(50);
  const { data: asPayer } = await sb.from("muse_booking_payments").select("*, payer_id(name, avatar), payee_id(name, avatar), booking_id(session_id, status)")
    .eq("payer_id", profile.id).order("created_at", { ascending: false }).limit(50);
  const all = [...(asPayee || []), ...(asPayer || [])];
  const deduped = Array.from(new Map(all.map((p: any) => [p.id, p])).values());
  deduped.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return NextResponse.json({ payments: deduped });
};

export const searchAll = async ({ sb, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "search", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { query, type = "all", limit = 20 } = rest;
  if (!query || query.trim().length < 2) return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  const q = query.trim();
  const results: any = { users: [], briefs: [], communities: [] };

  if (type === "all" || type === "users") {
    const { data: users } = await sb.from("muse_profiles")
      .select("id, name, type, avatar, loc, bio, styles, looking, verified, tier")
      .or(`name.ilike.%${q}%,bio.ilike.%${q}%,loc.ilike.%${q}%`)
      .limit(limit);
    results.users = users || [];
  }

  if (type === "all" || type === "briefs") {
    const { data: briefs } = await sb.from("muse_briefs")
      .select("id, title, description, type, budget, status, creator_id(name, avatar)")
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .eq("status", "open")
      .limit(limit);
    results.briefs = briefs || [];
  }

  if (type === "all" || type === "communities") {
    const { data: communities } = await sb.from("muse_communities")
      .select("id, name, description, cat, members, nsfw, img")
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,cat.ilike.%${q}%`)
      .limit(limit);
    results.communities = communities || [];
  }

  return NextResponse.json({ success: true, results });
};
