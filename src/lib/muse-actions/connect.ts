// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — CONNECT
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// First of the six highest-traffic domains wyzmind's handoff flagged to save
// for last (profile, match, message, feed, forum, connect) — starting with
// this one since it's the smallest and most self-contained of the six.
// Handler is an exported function; the monolith's ACTIONS registry still
// dispatches it under the same action name, so the POST URL and every
// frontend call site are UNCHANGED. Pure relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { checkRate } from "@/lib/rate-limit";
import { UUID_RE, emailProfile, NextResponse, type ActionContext } from "./shared";

export const connectRequest = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "connect", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { targetId } = rest;
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });
  if (targetId === profile.id) return NextResponse.json({ error: "Cannot connect with yourself" }, { status: 400 });
  if (!UUID_RE.test(String(targetId))) return NextResponse.json({ success: true, demo: true });
  const { data: target } = await sb.from("muse_profiles").select("id").eq("id", targetId).maybeSingle();
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 400 });
  await sb.from("muse_connections").upsert({ user_id: profile.id, target_id: targetId, status: "pending" }, { onConflict: "user_id,target_id", ignoreDuplicates: true }).select();
  await sb.from("muse_notifications").insert({ user_id: targetId, from_id: profile.id, type: "connection", body: `${profile.name} wants to connect`, read: false });
  await emailProfile(sb, targetId, "New connection request ✦", "Someone wants to connect", `${profile.name} sent you a connection request.`, "View request", "https://muse.wyzdesign.com/muse");
  return NextResponse.json({ success: true });
};
