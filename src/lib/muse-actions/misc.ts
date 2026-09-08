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
    "savedProfileIds",
    "savedSessionIds",
  ]);
  const source = (rest.preferences && typeof rest.preferences === "object") ? rest.preferences : rest;
  const prefs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
    if (ALLOWED_PREFS.has(k)) prefs[k] = v;
  }
  // Handle nested notification preference toggles (e.g. notifications.match = false)
  if (rest.toggleNotificationPref && typeof rest.toggleNotificationPref === "object") {
    const { key, value } = rest.toggleNotificationPref as { key: string; value: boolean };
    if (["match", "message", "brief", "like", "push", "email"].includes(key)) {
      const existing = (source as any).notifications || {};
      prefs.notifications = { ...existing, [key]: value };
    }
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
  const { notificationIds, markAll } = rest;
  if (markAll === true) {
    await sb.from("muse_notifications").update({ read: true }).eq("user_id", profile.id).eq("read", false);
    return NextResponse.json({ success: true, marked: "all" });
  }
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

// Builds a safe quoted ilike pattern for embedding into a Supabase/PostgREST
// `.or()` filter string. Without this, a raw `%${q}%` interpolation lets
// user input containing `,` `(` `)` inject extra filter clauses (PostgREST's
// `.or()` string splits on comma / groups on parens), and `%`/`_` in the
// query act as unintended ilike wildcards. Fix: escape backslash first (the
// ilike escape char), escape the wildcards and any embedded double-quote,
// then wrap the whole value in double quotes — PostgREST's quoted-value
// syntax treats everything inside as a literal, so `,`/`.`/`()` can no
// longer break out of the filter string.
function ilikeContainsPattern(raw: string): string {
  const escaped = raw
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/"/g, '\\"');
  return `"%${escaped}%"`;
}

export const searchAll = async ({ sb, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "search", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { query, type = "all", limit: rawLimit = 20, styles, creativeType, loc, verified, online, availability, destination, sort = "relevance" } = rest;
  if (!query || query.trim().length < 2) return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  const q = query.trim();
  const pattern = ilikeContainsPattern(q);
  const parsedLimit = Number(rawLimit);
  const limit = Number.isFinite(parsedLimit) ? Math.min(50, Math.max(1, Math.floor(parsedLimit))) : 20;
  const results: any = { users: [], briefs: [], communities: [] };

  if (type === "all" || type === "users") {
    let query = sb.from("muse_profiles")
      .select("id, name, type, avatar, loc, bio, styles, looking, verified, tier, travel_dates, availability_status, budget_range, travel_destinations, last_seen_at")
      .or(`name.ilike.${pattern},bio.ilike.${pattern},loc.ilike.${pattern},styles::text.ilike.${pattern}`);
    if (Array.isArray(styles) && styles.length > 0) {
      const styleFilters = styles.map((s: string) => `styles::text.ilike.%${s}%`);
      query = query.or(styleFilters.join(","));
    }
    if (creativeType) query = query.ilike("type", `%${creativeType}%`);
    if (loc) query = query.ilike("loc", `%${loc}%`);
    if (verified === true || verified === "true") query = query.eq("verified", true);
    if (online === true || online === "true") {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      query = query.gte("last_seen_at", fiveMinAgo);
    }
    if (availability) query = query.eq("availability_status", availability);
    if (destination) query = query.contains("travel_destinations", [destination]);
    if (sort === "popular") query = query.order("views_count", { ascending: false });
    else if (sort === "newest") query = query.order("created_at", { ascending: false });
    const { data: users } = await query.limit(limit);
    results.users = users || [];
  }

  if (type === "all" || type === "briefs") {
    const { data: briefs } = await sb.from("muse_briefs")
      .select("id, title, description, type, budget, status, creator_id(name, avatar)")
      .or(`title.ilike.${pattern},description.ilike.${pattern},type.ilike.${pattern}`)
      .eq("status", "open")
      .limit(limit);
    results.briefs = briefs || [];
  }

  if (type === "all" || type === "communities") {
    const { data: communities } = await sb.from("muse_communities")
      .select("id, name, description, category, member_count, is_nsfw, img, rules")
      .or(`name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`)
      .limit(limit);
    results.communities = communities || [];
  }

  if (type === "all" || type === "forum") {
    const { data: posts } = await sb.from("muse_forum_posts")
      .select("id, title, body, category, votes, author_id(name, avatar), created_at")
      .or(`title.ilike.${pattern},body.ilike.${pattern},category.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    results.forum = posts || [];
  }

  return NextResponse.json({ success: true, results });
};

// ═══ BOOST — unified inventory model ═══
// A boost is a timed visibility multiplier. Users own boosts in `boost_inventory`
// (earned via quest rewards or bought as a one-off) and spend one to activate a
// boost for a chosen duration, tracked by `boost_expires_at`. Pro users get one
// free weekly boost (the pricing-page "1x/week" promise); free users either spend
// an earned boost or buy one (create-boost-checkout — api/muse/connect).
import { NextResponse as _NR } from "next/server";

export const BOOST_DURATIONS = { "24h": 1, "72h": 3, "7d": 7 } as const;

async function grantBoosts(sb: any, userId: string, count: number) {
  if (count <= 0) return;
  const { data: prof } = await sb.from("muse_profiles").select("boost_inventory").eq("id", userId).maybeSingle();
  const cur = Number(prof?.boost_inventory || 0);
  await sb.from("muse_profiles").update({ boost_inventory: cur + count }).eq("id", userId);
}

// Export for quest claim (boost rewards) — see api/muse/connect and quests.ts.
export { grantBoosts as addBoostInventory };

// Spends a boost (inventory first, then Pro weekly allowance) and sets the
// active-boost expiry. Returns the new expiry, or null if none could be spent.
export async function spendBoost(sb: any, profileId: string, durationKey: string): Promise<string | null> {
  const hours = BOOST_DURATIONS[durationKey as keyof typeof BOOST_DURATIONS];
  if (!hours) return null;
  const { data: prof } = await sb.from("muse_profiles").select("tier, boost_inventory, boost_expires_at").eq("id", profileId).maybeSingle();
  if (!prof) return null;
  const isPro = prof.tier === "muse_pro" || prof.tier === "pro" || prof.tier === "muse_studio";

  const running = prof.boost_expires_at && new Date(prof.boost_expires_at).getTime() > Date.now()
    ? new Date(prof.boost_expires_at).getTime()
    : Date.now();
  const newExpiry = new Date(running + hours * 24 * 60 * 60 * 1000).toISOString();

  const inventory = Number(prof.boost_inventory || 0);
  if (inventory > 0) {
    await sb.from("muse_profiles").update({ boost_expires_at: newExpiry, boost_inventory: inventory - 1 }).eq("id", profileId);
    return newExpiry;
  }
  if (isPro) {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now); monday.setDate(now.getDate() - day);
    const { count } = await sb.from("muse_activity_log")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", profileId).eq("action", "boost")
      .gte("created_at", monday.toISOString());
    if ((count ?? 0) >= 1) return null;
    await sb.from("muse_activity_log").insert({ user_id: profileId, action: "boost", details: { week: monday.toISOString().slice(0, 10), at: now.toISOString(), duration: durationKey } });
    await sb.from("muse_profiles").update({ boost_expires_at: newExpiry }).eq("id", profileId);
    return newExpiry;
  }
  return null;
}

export async function boostActivate({ sb, profile, rest }: ActionContext) {
  const durationKey = String(rest?.duration || "24h");
  if (!BOOST_DURATIONS[durationKey as keyof typeof BOOST_DURATIONS]) {
    return _NR.json({ error: "duration must be 24h, 72h, or 7d" }, { status: 400 });
  }
  const expiry = await spendBoost(sb, profile.id, durationKey);
  if (!expiry) {
    const status = await getBoostStatus(sb, profile.id);
    if (!status.isPro && status.inventory === 0) {
      return _NR.json({ error: "No boosts available — earn one via quests or buy a boost", code: "NO_BOOSTS" }, { status: 402 });
    }
    return _NR.json({ error: "Weekly boost already used — resets next week" }, { status: 429 });
  }
  return _NR.json({ success: true, duration: durationKey, expiresAt: expiry });
}

export async function boostStatus({ sb, profile }: ActionContext) {
  return _NR.json(await getBoostStatus(sb, profile.id));
}// Confirms a completed one-off boost purchase and grants the boost inventory.
// The Stripe Checkout/connect route creates the payment with a known
// muse_boost_purchase row; we re-check the row (idempotent) so a retry or a
// duplicate client call can never double-grant.
export async function saveBoostPurchase({ sb, profile, rest }: ActionContext) {
  const { purchaseId, quantity } = rest;
  const qty = Math.min(Math.max(Number(quantity || 1), 1), 20);
  if (!purchaseId) return _NR.json({ error: "purchaseId required" }, { status: 400 });
  const { data: purchase, error } = await sb.from("muse_boost_purchases")
    .select("id, user_id, quantity, status")
    .eq("id", purchaseId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (error || !purchase) return _NR.json({ error: "Purchase not found" }, { status: 404 });
  if ((purchase as any).status === "granted") {
    return _NR.json({ success: true, alreadyGranted: true, quantity: (purchase as any).quantity });
  }
  await grantBoosts(sb, profile.id, Number((purchase as any).quantity || qty));
  await sb.from("muse_boost_purchases").update({ status: "granted", granted_at: new Date().toISOString() }).eq("id", purchaseId);
  return _NR.json({ success: true, quantity: Number((purchase as any).quantity || qty) });
}

// Audit fix (2026-09-08): the "is this boost timestamp still active" check was
// independently reimplemented in get.ts (discover-ranked and creative-trust)
// instead of going through this shared logic — all three happened to agree
// today, but any future change here (a grace period, etc.) would silently
// desync the Discover badge and the creative-trust card from the real status.
// Pulled the pure comparison out so callers that already have the row's
// boost_expires_at in hand (no need for another DB round trip) can still
// share the one formula.
export function isBoostActive(expiresAt: string | null | undefined): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() > Date.now();
}

// Shared boost state — used by boostActivate and surfaced to the client.
export async function getBoostStatus(sb: any, profileId: string) {
  const { data: prof } = await sb.from("muse_profiles")
    .select("tier, boost_inventory, boost_expires_at")
    .eq("id", profileId).maybeSingle();
  const isPro = !!prof && (prof.tier === "muse_pro" || prof.tier === "pro" || prof.tier === "muse_studio");
  const expiresAt = prof?.boost_expires_at || null;
  const isBoosted = isBoostActive(expiresAt);
  return { isPro, inventory: Number(prof?.boost_inventory || 0), isBoosted, expiresAt: isBoosted ? expiresAt : null };
}

// ═══ BOOST ANALYTICS ═══
export async function boostAnalytics({ sb, profile }: ActionContext) {
  const now = new Date();
  const status = await getBoostStatus(sb, profile.id);
  const boostStartedAt = status.expiresAt ? null : null;
  // Determine the boost-relevant window: from the most recent boost activation
  // (activity log) within the boost period, else fall back to this week.
  const { data: boostLog } = await sb.from("muse_activity_log")
    .select("created_at, details").eq("user_id", profile.id).eq("action", "boost")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const windowStart = boostLog?.created_at || null;
  const gte = windowStart ? windowStart : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: profileViews } = await sb.from("muse_activity_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id).eq("action", "profile_view")
    .gte("created_at", gte);
  const { count: matchesReceived } = await sb.from("muse_matches")
    .select("*", { count: "exact", head: true })
    .eq("target_id", profile.id)
    .gte("created_at", gte);
  const { count: likesReceived } = await sb.from("muse_matches")
    .select("*", { count: "exact", head: true })
    .eq("target_id", profile.id)
    .gte("created_at", gte);
  return _NR.json({
    isBoosted: status.isBoosted,
    boostStartedAt: windowStart,
    expiresAt: status.expiresAt,
    inventory: status.inventory,
    stats: { profileViews: profileViews || 0, matchesReceived: matchesReceived || 0, likesReceived: likesReceived || 0 },
  });
}

// ═══ SAVED SEARCHES ═══
export const savedSearchSave = async ({ sb, profile, rest }: ActionContext) => {
  const { name, query, filters } = rest;
  const cleanName = String(name || "").trim().slice(0, 100);
  if (!cleanName) return NextResponse.json({ error: "name required" }, { status: 400 });
  const { error } = await sb.from("muse_saved_searches").insert({
    user_id: profile.id,
    name: cleanName,
    query: String(query || "").trim().slice(0, 200),
    filters: filters && typeof filters === "object" ? filters : {},
  });
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};

export const savedSearchList = async ({ sb, profile }: ActionContext) => {
  const { data } = await sb.from("muse_saved_searches")
    .select("id, name, query, filters, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);
  return NextResponse.json({ searches: data || [] });
};

export const savedSearchDelete = async ({ sb, profile, rest }: ActionContext) => {
  const { searchId } = rest;
  if (!searchId) return NextResponse.json({ error: "searchId required" }, { status: 400 });
  await sb.from("muse_saved_searches").delete().eq("id", searchId).eq("user_id", profile.id);
  return NextResponse.json({ success: true });
};

export const savedSearchAlerts = async ({ sb, profile }: ActionContext) => {
  const { data: searches } = await sb.from("muse_saved_searches")
    .select("id, name, query, filters, last_notified_at")
    .eq("user_id", profile.id);
  if (!searches?.length) return NextResponse.json({ alerts: [] });
  const alerts: any[] = [];
  for (const search of searches) {
    const since = search.last_notified_at || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const pattern = search.query ? `%${search.query}%` : null;
    let query = sb.from("muse_profiles").select("id, name, type, avatar").gte("created_at", since);
    if (pattern) query = query.or(`name.ilike.${pattern},bio.ilike.${pattern},loc.ilike.${pattern}`);
    const filters = search.filters && typeof search.filters === "object" ? search.filters : {};
    if (filters.styles) query = query.contains("styles", Array.isArray(filters.styles) ? filters.styles : [filters.styles]);
    if (filters.type) query = query.ilike("type", `%${filters.type}%`);
    if (filters.loc) query = query.ilike("loc", `%${filters.loc}%`);
    if (filters.verified) query = query.eq("verified", true);
    const { data: newMatches } = await query.limit(5);
    if (newMatches?.length) {
      alerts.push({ searchId: search.id, name: search.name, newMatches });
      await sb.from("muse_saved_searches").update({ last_notified_at: new Date().toISOString() }).eq("id", search.id);
    }
  }
  return NextResponse.json({ alerts });
};

// ═══ PHOTO LIKES — like the image itself (not the profile), keyed by URL ═══
export async function togglePhotoLike({ sb, profile, rest }: ActionContext) {
  const photoUrl = typeof rest?.photoUrl === "string" ? rest.photoUrl.trim() : "";
  if (!photoUrl) return _NR.json({ error: "photoUrl required" }, { status: 400 });
  if (photoUrl.length > 1000) return _NR.json({ error: "photoUrl too long" }, { status: 400 });
  const { data: existing } = await sb.from("muse_photo_likes")
    .select("id").eq("user_id", profile.id).eq("photo_url", photoUrl).maybeSingle();
  let liked: boolean;
  if (existing) {
    await sb.from("muse_photo_likes").delete().eq("id", existing.id);
    liked = false;
  } else {
    await sb.from("muse_photo_likes").insert({ user_id: profile.id, photo_url: photoUrl });
    liked = true;
  }
  const { count } = await sb.from("muse_photo_likes").select("*", { count: "exact", head: true }).eq("photo_url", photoUrl);
  return _NR.json({ success: true, liked, count: count || 0 });
};
