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
import { sanitizeText } from "@/lib/request-safety";
import { UUID_RE, emailProfile, NextResponse, safeServerError, type ActionContext } from "./shared";

const ANCHOR_TYPES = new Set(["prompt", "photo"]);

/** Builds the notification body shown to the recipient of a like — anchored
 *  to the specific prompt/photo that was liked when that context is present,
 *  falling back to the note text, then to the generic match message. This is
 *  the real surface (muse_notifications.body) the recipient sees; it must
 *  name the specific thing that was liked, not just a generic blurb. */
function likeNotificationBody(name: string, anchorType: string | null, anchorValue: string, note: string): string {
  if (anchorType === "prompt" && anchorValue) {
    const q = anchorValue.length > 90 ? anchorValue.slice(0, 90) + "…" : anchorValue;
    return `${name} liked your prompt: "${q}"`;
  }
  if (anchorType === "photo" && anchorValue) {
    return `${name} liked your ${anchorValue}!`;
  }
  if (note) {
    const n = note.length > 90 ? note.slice(0, 90) + "…" : note;
    return `${name} sent you a note: "${n}"`;
  }
  return `${name} matched with you!`;
}

export const matchCreate = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "match", 30)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { target_id } = rest;
  if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
  if (target_id === profile.id) return NextResponse.json({ error: "Cannot match yourself" }, { status: 400 });
  // Hinge-style anchored likes: which specific prompt/photo (if any) this like
  // was attached to, plus an optional note. All nullable — a plain swipe
  // sends none of these.
  const rawAnchorType = typeof rest.anchor_type === "string" ? rest.anchor_type : "";
  const anchorType = ANCHOR_TYPES.has(rawAnchorType) ? rawAnchorType : null;
  const anchorValue = anchorType ? sanitizeText(String(rest.anchor_value || ""), 300) : "";
  const note = sanitizeText(String(rest.note || ""), 200);
  if (!UUID_RE.test(String(target_id))) {
    await sb.from("muse_notifications").insert({ user_id: profile.id, type: "match", body: "You matched with a new creative!", read: false });
    return NextResponse.json({ success: true, demo: true });
  }
  const { data: target } = await sb.from("muse_profiles").select("id, suspended").eq("id", target_id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 400 });
  if (target.suspended) return NextResponse.json({ error: "Unable to match with this user" }, { status: 403 });
  const { data: matchBlock } = await sb.from("muse_blocks").select("id").or(`and(user_id.eq.${profile.id},target_id.eq.${target_id}),and(user_id.eq.${target_id},target_id.eq.${profile.id})`).limit(1).maybeSingle();
  if (matchBlock) return NextResponse.json({ error: "Unable to match with this user" }, { status: 403 });
  const upsertRow: Record<string, unknown> = { user_id: profile.id, target_id };
  if (anchorType) { upsertRow.anchor_type = anchorType; upsertRow.anchor_value = anchorValue; }
  if (note) upsertRow.note = note;
  // ignoreDuplicates:false so a later anchored/annotated call for the same
  // pair updates the existing row's anchor/note instead of being silently
  // dropped by an earlier plain-swipe upsert (order between the two isn't
  // guaranteed) — columns omitted from a given call are left untouched.
  const { error } = await sb.from("muse_matches").upsert(
    upsertRow,
    { onConflict: "user_id,target_id", ignoreDuplicates: false }
  );
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "match", details: { target_id, anchor_type: anchorType, anchor_value: anchorValue || undefined } });
  const body = likeNotificationBody(String(profile.name || "Someone"), anchorType, anchorValue, note);
  await sb.from("muse_notifications").insert({ user_id: target_id, from_id: profile.id, type: "match", body, read: false });
  await emailProfile(sb, target_id, "Someone liked you ✦", "New like on Muse", body, "See who it is", "https://muse.wyzdesign.com/muse", "match");
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
