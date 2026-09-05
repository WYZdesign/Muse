// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — MATCHING & DISCOVERY
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// One of the six highest-traffic domains wyzmind's handoff flagged to save for
// last. Handlers are exported functions; the monolith's ACTIONS registry still
// dispatches them under the same action names, so the POST URL and every
// frontend call site are UNCHANGED. Pure relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { checkRate, checkRateUser } from "@/lib/rate-limit";
import { bumpQuest } from "@/lib/questEngine";
import { UUID_RE, emailProfile, NextResponse, safeServerError, type ActionContext } from "./shared";

export const matchCreate = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "match", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { target_id } = rest;
  if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
  if (target_id === profile.id) return NextResponse.json({ error: "Cannot match yourself" }, { status: 400 });
  if (!UUID_RE.test(String(target_id))) {
    await sb.from("muse_notifications").insert({ user_id: profile.id, type: "match", body: "You matched with a new creative!", read: false });
    return NextResponse.json({ success: true, demo: true });
  }
  const { data: target } = await sb.from("muse_profiles").select("id, suspended").eq("id", target_id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 400 });
  if (target.suspended) return NextResponse.json({ error: "Unable to match with this user" }, { status: 403 });
  const { data: matchBlock } = await sb.from("muse_blocks").select("id").or(`and(user_id.eq.${profile.id},target_id.eq.${target_id}),and(user_id.eq.${target_id},target_id.eq.${profile.id})`).limit(1).maybeSingle();
  if (matchBlock) return NextResponse.json({ error: "Unable to match with this user" }, { status: 403 });
  const { error } = await sb.from("muse_matches").upsert(
    { user_id: profile.id, target_id },
    { onConflict: "user_id,target_id", ignoreDuplicates: true }
  );
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "match", details: { target_id } });
  await sb.from("muse_notifications").insert({ user_id: target_id, from_id: profile.id, type: "match", body: `${profile.name} matched with you!`, read: false });
  await emailProfile(sb, target_id, "Someone matched with you ✦", "New match on Muse", `${profile.name} matched with you. Open Muse to say hi.`, "See who it is", "https://muse.wyzdesign.com/muse", "match");
  await bumpQuest(sb, profile.id, "match");
  return NextResponse.json({ success: true });
};

export const matchDelete = async ({ sb, profile, rest }: ActionContext) => {
  const { target_id } = rest;
  if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
  if (UUID_RE.test(String(target_id))) {
    await sb.from("muse_matches").delete().eq("user_id", profile.id).eq("target_id", target_id);
    await sb.from("muse_matches").delete().eq("user_id", target_id).eq("target_id", profile.id);
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "unmatch", details: { target_id } });
  }
  return NextResponse.json({ success: true });
};

export const profileViewTrack = async ({ sb, profile, rest }: ActionContext) => {
  if (!await checkRateUser(profile.id, "track-view", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { target_id } = rest;
  if (!target_id || target_id === profile.id) return NextResponse.json({ success: true });
  if (!UUID_RE.test(String(target_id))) return NextResponse.json({ success: true, demo: true });
  const { data: cur } = await sb.from("muse_profiles").select("views_count").eq("id", target_id).maybeSingle();
  const next = ((cur as any)?.views_count || 0) + 1;
  const { error } = await sb.from("muse_profiles").update({ views_count: next }).eq("id", target_id);
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true });
};
