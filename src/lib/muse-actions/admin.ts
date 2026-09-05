// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — ADMIN
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// Handlers are exported functions; the monolith's ACTIONS registry still
// dispatches them under the same action names, so the POST URL and every
// frontend call site are UNCHANGED. Pure relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { checkRate } from "@/lib/rate-limit";
import { askMuseAI } from "@/lib/aiDocs";
import { scanWithRekognition, logScan } from "@/lib/contentScan";
import { UUID_RE, isAdminEmail, NextResponse, safeServerError, type ActionContext } from "./shared";

export const adminResolveAppeal = async ({ sb, profile, rest }: ActionContext) => {
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { strikeId, resolution } = rest;
  if (!strikeId || !["upheld", "overturned"].includes(resolution as string)) {
    return NextResponse.json({ error: "strikeId and valid resolution required" }, { status: 400 });
  }
  const updates: Record<string, unknown> = {
    appeal_status: resolution,
    appeal_resolved_at: new Date().toISOString(),
    appeal_resolved_by: profile.id,
  };
  if (resolution === "overturned") {
    updates.severity = "warning";
  }
  const { error } = await sb.from("muse_strikes").update(updates).eq("id", strikeId);
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_admin_audit_log").insert({ admin_user_id: profile.id, query_text: `resolve_appeal:${strikeId}:${resolution}` });
  return NextResponse.json({ success: true });
};

export const adminBrain = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "admin-brain", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { query: userQuery } = rest;
  if (!userQuery || typeof userQuery !== "string") {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  try {
    const q = userQuery.toLowerCase();
    let result: Record<string, unknown> = {};

    if (q.includes("user") && (q.includes("count") || q.includes("total") || q.includes("how many"))) {
      const { count } = await sb.from("muse_profiles").select("*", { count: "exact", head: true });
      result = { answer: `Total registered users: ${count || 0}`, data: { count: count || 0 } };
    } else if (q.includes("match") && (q.includes("count") || q.includes("total"))) {
      const { count } = await sb.from("muse_matches").select("*", { count: "exact", head: true });
      result = { answer: `Total matches: ${count || 0}`, data: { count: count || 0 } };
    } else if (q.includes("report") || q.includes("flag")) {
      const { data: reports } = await sb.from("muse_reports").select("*, reporter_id(id, name), target_id(id, name)").order("created_at", { ascending: false }).limit(20);
      const { count } = await sb.from("muse_reports").select("*", { count: "exact", head: true });
      result = { answer: `Total reports: ${count || 0}. Showing most recent.`, data: { reports: reports || [], count: count || 0 } };
    } else if (q.includes("strike") || q.includes("suspension") || q.includes("ban")) {
      const { data: strikes } = await sb.from("muse_strikes").select("*, user_id(id, name, avatar)").order("created_at", { ascending: false }).limit(20);
      const { count } = await sb.from("muse_strikes").select("*", { count: "exact", head: true });
      const suspended = (strikes || []).filter((s: any) => s.severity === "suspension" && (!s.suspension_ends_at || new Date(s.suspension_ends_at) > new Date()));
      result = { answer: `Total strikes: ${count || 0}. Currently suspended: ${suspended.length}.`, data: { strikes: strikes || [], suspendedCount: suspended.length } };
    } else if (q.includes("disclosure")) {
      const { data: disclosures } = await sb.from("muse_disclosures").select("*, proposer_id(id, name), responder_id(id, name)").order("created_at", { ascending: false }).limit(20);
      const blocked = (disclosures || []).filter((d: any) => d.status === "blocked");
      result = { answer: `Total disclosures: ${(disclosures || []).length}. Blocked: ${blocked.length}.`, data: { disclosures: disclosures || [], blockedCount: blocked.length } };
    } else if (q.includes("active") || q.includes("retention") || q.includes("engagement")) {
      const since7d = new Date(Date.now() - 7 * 86400000).toISOString();
      const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
      const [active7d, active30d, newUsers30d] = await Promise.all([
        sb.from("muse_activity_log").select("user_id").gte("created_at", since7d),
        sb.from("muse_activity_log").select("user_id").gte("created_at", since30d),
        sb.from("muse_profiles").select("id").gte("created_at", since30d),
      ]);
      const activeUsers7d = new Set((active7d.data || []).map((r: any) => r.user_id).filter(Boolean)).size;
      const activeUsers30d = new Set((active30d.data || []).map((r: any) => r.user_id).filter(Boolean)).size;
      result = { answer: `Active users (7d): ${activeUsers7d}, Active (30d): ${activeUsers30d}, New signups (30d): ${(newUsers30d.data || []).length}`, data: { active7d: activeUsers7d, active30d: activeUsers30d, newUsers30d: (newUsers30d.data || []).length } };
    } else if (q.includes("safety") || q.includes("checkin")) {
      const { data: checkins } = await sb.from("muse_safety_checkins").select("*, user_id(id, name)").order("created_at", { ascending: false }).limit(20);
      const pending = (checkins || []).filter((c: any) => c.status === "pending");
      const cancelled = (checkins || []).filter((c: any) => c.status === "cancelled");
      result = { answer: `Safety check-ins: ${(checkins || []).length} total. Pending: ${pending.length}. Cancelled: ${cancelled.length}.`, data: { checkins: checkins || [], pendingCount: pending.length, cancelledCount: cancelled.length } };
    } else if (q.includes("user") && (q.includes("detail") || q.includes("profile") || q.includes("info") || q.includes("lookup"))) {
      const searchTerm = q.replace(/.*(?:detail|profile|info|lookup)\s+(?:user\s*)?/i, "").trim();
      if (!searchTerm) return NextResponse.json({ error: "Provide a name or email to look up", data: {} });
      const isEmail = searchTerm.includes("@");
      const { data: users } = await sb.from("muse_profiles").select("id, auth_id, name, email, type, avatar, bio, loc, looking, styles, photos, nsfw, tier, pro_expires_at, created_at, profile_completion_pct, suspended, stats, referrals, age_verified").ilike(isEmail ? "email" : "name", `%${searchTerm}%`).limit(5);
      if (!users || users.length === 0) return NextResponse.json({ answer: `No user found matching "${searchTerm}".`, data: {} });
      const user = users[0];
      const [activityRes, matchesRes, reportsRes, strikesRes, bookingsRes] = await Promise.all([
        sb.from("muse_activity_log").select("id, type, target_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        sb.from("muse_matches").select("id, created_at").or(`user_id.eq.${user.id},target_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(10),
        sb.from("muse_reports").select("id, reason, target_type, status, created_at").eq("reporter_id", user.id).order("created_at", { ascending: false }).limit(10),
        sb.from("muse_strikes").select("id, reason, severity, suspension_ends_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        sb.from("muse_booking_payments").select("id, amount, status, created_at").or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(10),
      ]);
      const { count: reportsAgainst } = await sb.from("muse_reports").select("*", { count: "exact", head: true }).eq("target_id", user.id);
      const activeStrikes = (strikesRes.data || []).filter((s: any) => s.severity === "suspension" && (!s.suspension_ends_at || new Date(s.suspension_ends_at) > new Date()));
      const answer = [
        `👤 ${user.name} (${user.email}) — ${user.type || "N/A"} · ${user.tier || "free"} tier`,
        user.suspended ? "⚠️ SUSPENDED" : "Active",
        `Joined: ${new Date(user.created_at).toLocaleDateString()} · Profile: ${user.profile_completion_pct || 0}%`,
        `Bio: ${(user.bio || "none").slice(0, 120)} · Location: ${user.loc || "unset"}`,
        `Looking: ${(user.looking || []).join(", ") || "unset"} · NSFW: ${user.nsfw ? "yes" : "no"}`,
        `Stats: ${JSON.stringify(user.stats || {})}`,
        `Activity: ${(activityRes.data || []).length} recent events · Matches: ${(matchesRes.data || []).length} · Reports filed: ${(reportsRes.data || []).length} · Reports against: ${reportsAgainst || 0}`,
        `Strikes: ${(strikesRes.data || []).length} total, ${activeStrikes.length} active suspensions`,
        `Payments: ${(bookingsRes.data || []).length} recent`,
      ].join("\n");
      result = { answer, data: { profile: user, activity: activityRes.data || [], matches: matchesRes.data || [], reportsFiled: reportsRes.data || [], reportsAgainst: reportsAgainst || 0, strikes: strikesRes.data || [], activeStrikes: activeStrikes.length, payments: bookingsRes.data || [] } };
    } else if (q.includes("user") && (q.includes("find") || q.includes("search") || q.includes("name"))) {
      const searchTerm = q.replace(/.*(?:find|search|name)\s+(?:user\s*)?/i, "").trim();
      const { data: users } = await sb.from("muse_profiles").select("id, name, email, type, avatar, tier, suspended, created_at, profile_completion_pct").ilike("name", `%${searchTerm}%`).limit(10);
      result = { answer: `Found ${(users || []).length} users matching "${searchTerm}".`, data: { users: users || [] } };
    } else if (q.includes("prompt") && (q.includes("response") || q.includes("answer"))) {
      const { count } = await sb.from("muse_prompt_responses").select("*", { count: "exact", head: true });
      const { count: totalPrompts } = await sb.from("muse_prompt_bank").select("*", { count: "exact", head: true }).eq("active", true);
      result = { answer: `Prompt responses: ${count || 0} across ${totalPrompts || 0} active prompts.`, data: { responseCount: count || 0, promptCount: totalPrompts || 0 } };
    } else {
      const counts = await Promise.all([
        sb.from("muse_profiles").select("*", { count: "exact", head: true }),
        sb.from("muse_matches").select("*", { count: "exact", head: true }),
        sb.from("muse_reports").select("*", { count: "exact", head: true }),
        sb.from("muse_strikes").select("*", { count: "exact", head: true }),
        sb.from("muse_disclosures").select("*", { count: "exact", head: true }),
      ]);
      result = {
        answer: `Muse Overview: ${counts[0].count || 0} users, ${counts[1].count || 0} matches, ${counts[2].count || 0} reports, ${counts[3].count || 0} strikes, ${counts[4].count || 0} disclosures.`,
        data: { users: counts[0].count || 0, matches: counts[1].count || 0, reports: counts[2].count || 0, strikes: counts[3].count || 0, disclosures: counts[4].count || 0 }
      };
    }

    let answer = String(result.answer || "");
    let aiSources: string[] = [];
    try {
      const enriched = await askMuseAI(
        `Question: ${userQuery}\n\nLive metrics (from database): ${JSON.stringify((result as any).data || {})}`,
        { forAdmin: true }
      );
      if (enriched) {
        answer = enriched.answer;
        aiSources = enriched.sources;
      }
    } catch { /* AI is best-effort; keep rule-based answer */ }

    await sb.from("muse_admin_audit_log").insert({
      admin_user_id: profile.id, query_text: userQuery.slice(0, 1000),
      query_result_summary: answer.slice(0, 500),
      result_row_count: Array.isArray((result as any).data?.users) ? (result as any).data.users.length : 0,
    });

    return NextResponse.json({ answer, data: (result as any).data, sources: aiSources, ai: aiSources.length > 0 });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Query failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
};

export const adminReports = async ({ sb, profile }: ActionContext) => {
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data: reports } = await sb.from("muse_reports").select("*, reporter_id(id, name, avatar), target_id(id, name, avatar)")
    .order("created_at", { ascending: false }).limit(50);
  return NextResponse.json({ reports: reports || [] });
};

export const adminStrikes = async ({ sb, profile }: ActionContext) => {
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data: strikes } = await sb.from("muse_strikes").select("*, user_id(id, name, avatar)")
    .order("created_at", { ascending: false }).limit(50);
  return NextResponse.json({ strikes: strikes || [] });
};

export const adminSuspendUser = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "admin-suspend-user", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { targetUserId, reason, durationDays } = rest;
  if (!targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  if (targetUserId === profile.id) return NextResponse.json({ error: "Cannot suspend yourself" }, { status: 400 });
  const suspensionEnd = durationDays ? new Date(Date.now() + (durationDays as number) * 86400000).toISOString() : null;
  const { error } = await sb.from("muse_strikes").insert({
    user_id: targetUserId, issued_by: profile.id,
    reason: String(reason || "Suspended by admin"),
    category: "high_severity",
    severity: suspensionEnd ? "suspension" : "permanent_ban",
    suspension_ends_at: suspensionEnd,
  });
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_profiles").update({ suspended: true, suspended_at: new Date().toISOString() }).eq("id", targetUserId);
  await sb.from("muse_notifications").insert({
    user_id: targetUserId, from_id: profile.id, type: "suspension",
    body: suspensionEnd ? `Your account has been suspended until ${new Date(suspensionEnd).toLocaleDateString()}` : "Your account has been permanently banned",
    read: false
  });
  await sb.from("muse_admin_audit_log").insert({ admin_user_id: profile.id, query_text: `suspend_user:${targetUserId}:${suspensionEnd ? "until " + suspensionEnd : "permanent"}:${String(reason || "").slice(0, 300)}` });
  return NextResponse.json({ success: true });
};

export const adminScanNsfw = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "admin-scan-nsfw", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  if (!isAdminEmail(profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, all } = rest;

  let profilesToScan: { id: string; avatar: string; name: string }[] = [];
  if (all) {
    const { data } = await sb.from("muse_profiles").select("id, avatar, name").eq("nsfw", false).not("avatar", "eq", "").limit(100);
    profilesToScan = data || [];
  } else if (userId) {
    const { data } = await sb.from("muse_profiles").select("id, avatar, name").eq("id", userId).maybeSingle();
    if (data) profilesToScan = [data];
  } else {
    return NextResponse.json({ error: "Provide userId or all:true" }, { status: 400 });
  }

  let scanned = 0, flagged = 0, errors = 0;
  for (const p of profilesToScan) {
    if (!p.avatar || p.avatar.startsWith("/")) { continue; }
    let avatarUrl: URL;
    try { avatarUrl = new URL(p.avatar); } catch { errors++; continue; }
    const allowedHosts = ["supabase.co", "supabase.in", "vercel.app", "vercel.storage", "cloudinary.com", "amazonaws.com"];
    const hostOk = allowedHosts.some(h => avatarUrl.hostname.endsWith(`.${h}`) || avatarUrl.hostname === h);
    if (!hostOk || avatarUrl.protocol !== "https:") { errors++; continue; }

    try {
      const resp = await fetch(avatarUrl.toString(), { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) { errors++; continue; }
      const buf = Buffer.from(await resp.arrayBuffer());
      const result = await scanWithRekognition(buf);
      await logScan({ userId: p.id, fileName: "avatar-scan", fileType: "image/jpeg", fileSize: buf.length, context: "admin-scan", result });
      scanned++;
      if (result.scanned && result.flaggedCategories.some(c => /^suggestive/i.test(c))) {
        await sb.from("muse_profiles").update({ nsfw: true }).eq("id", p.id);
        flagged++;
      }
    } catch { errors++; }
  }
  await sb.from("muse_admin_audit_log").insert({ admin_user_id: profile.id, query_text: `scan_nsfw:${all ? "all" : String(userId)}:scanned=${scanned}:flagged=${flagged}:errors=${errors}` });
  return NextResponse.json({ success: true, scanned, flagged, errors, total: profilesToScan.length });
};

export const adminContentScans = async ({ sb, profile }: ActionContext) => {
  if (!isAdminEmail(profile.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [scans, incidents] = await Promise.all([
    sb.from("muse_content_scans")
      .select("id, user_id, file_name, file_type, context, safe, flagged_categories, confidence, should_block, should_report, is_csam, scanned_at")
      .order("scanned_at", { ascending: false }).limit(100),
    sb.from("muse_safety_incidents")
      .select("id, user_id, type, severity, details, status, created_at")
      .in("status", ["pending_review", "pending_ncmec"])
      .order("created_at", { ascending: false }).limit(100),
  ]);
  return NextResponse.json({ scans: scans.data || [], incidents: incidents.data || [] });
};

export const adminResolveIncident = async ({ sb, profile, rest }: ActionContext) => {
  if (!isAdminEmail(profile.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { incidentId } = rest;
  if (!incidentId || !UUID_RE.test(String(incidentId))) return NextResponse.json({ error: "incidentId required" }, { status: 400 });
  const { error } = await sb.from("muse_safety_incidents").update({ status: "reviewed" }).eq("id", incidentId);
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_admin_audit_log").insert({ admin_user_id: profile.id, query_text: `resolve_incident:${incidentId}` });
  return NextResponse.json({ success: true });
};
