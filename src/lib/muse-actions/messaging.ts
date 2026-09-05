// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — MESSAGING
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// One of the six highest-traffic domains wyzmind's handoff flagged to save for
// last. Handler is an exported function; the monolith's ACTIONS registry still
// dispatches it under the same action name, so the POST URL and every frontend
// call site are UNCHANGED. Pure relocation — no behavior change (dropped one
// unused `[userA, userB] = ...sort()` destructure that was dead in the
// original — matchId below already recomputes the sorted pair independently).
// ══════════════════════════════════════════════════════════════════════════════
import { checkRateUser } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/request-safety";
import { screenText } from "@/lib/aiModeration";
import { UUID_RE, emailProfile, validateInput, NextResponse, safeServerError, type ActionContext } from "./shared";

export const messageSend = async ({ sb, profile, rest }: ActionContext) => {
  if (!await checkRateUser(profile.id, "message", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const vErr = validateInput(rest);
  if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
  const { toId, text, image_url, img, client_msg_id } = rest;
  const imageUrl = image_url || img;
  if (!text?.trim() && !imageUrl) return NextResponse.json({ error: "text or image required" }, { status: 400 });
  if (!toId) return NextResponse.json({ error: "toId required" }, { status: 400 });
  if (UUID_RE.test(String(toId))) {
    const { data: msgBlock } = await sb.from("muse_blocks").select("id").or(`and(user_id.eq.${profile.id},target_id.eq.${toId}),and(user_id.eq.${toId},target_id.eq.${profile.id})`).limit(1).maybeSingle();
    if (msgBlock) return NextResponse.json({ error: "Unable to message this user" }, { status: 403 });
  }
  const { data: mutualMatch } = await sb.from("muse_matches")
    .select("id").eq("user_id", profile.id).eq("target_id", toId).maybeSingle();
  const { data: reverseMatch } = await sb.from("muse_matches")
    .select("id").eq("user_id", toId).eq("target_id", profile.id).maybeSingle();
  const hasMatch = !!mutualMatch && !!reverseMatch;

  let sameCommunity = false;
  if (!hasMatch) {
    const { data: myCommunities } = await sb.from("muse_community_members")
      .select("community_id").eq("user_id", profile.id);
    const { data: theirCommunities } = await sb.from("muse_community_members")
      .select("community_id").eq("user_id", toId);
    if (myCommunities?.length && theirCommunities?.length) {
      const myIds = new Set(myCommunities.map(c => c.community_id));
      sameCommunity = theirCommunities.some(c => myIds.has(c.community_id));
    }
  }

  if (!hasMatch && !sameCommunity) {
    return NextResponse.json({ error: "You need to match with this person before messaging, or join a shared community." }, { status: 403 });
  }
  const cleanText = sanitizeText(String(text || "").trim());
  if (!cleanText && !imageUrl) return NextResponse.json({ error: "text or image required" }, { status: 400 });
  const screen = cleanText ? screenText(cleanText) : { block: false, categories: [] as string[] };
  if (screen.block) {
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "message_blocked", details: { categories: screen.categories } });
    return NextResponse.json({ error: "Message blocked by safety policy", code: "SAFETY_BLOCK" }, { status: 403 });
  }
  const lower = cleanText.toLowerCase();
  const hasPayment = /\$[\d]+|\bpay\b|\bcompensation\b|\brate\b|\bbudget\b|\bfee\b|\bcharged?\b/i.test(lower);
  const hasNsfw = /\bnude\b|\bnudity\b|\bnsfw\b|\bnsf[ww]\b|\bexplicit\b|\bboudoir\b|\bpenetrat\b|\bsexual\b|\berotic\b|\btopless\b|\bundressed\b|\bintimate\b|\bsensual\b|\badult\b/i.test(lower);
  if (hasPayment && hasNsfw) {
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "disclosure_required", details: { to: toId } });
    return NextResponse.json({ error: "Disclosure required before discussing paid NSFW shoots", code: "DISCLOSURE_REQUIRED" }, { status: 409 });
  }
  const matchId = [profile.id, String(toId)].sort().join("__");
  const { error } = await sb.from("muse_messages").insert({
    match_id: matchId,
    sender_id: profile.id,
    receiver_id: String(toId),
    text: cleanText,
    img: img || image_url || "",
    client_msg_id: typeof client_msg_id === "string" ? client_msg_id.slice(0, 120) : undefined,
  });
  if (error && (error as { code?: string }).code !== "23505") return safeServerError(error, "message insert");
  await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "message", details: { to: toId } });
  if (UUID_RE.test(String(toId))) {
    await sb.from("muse_notifications").insert({ user_id: String(toId), from_id: profile.id, type: "message", body: `${profile.name} sent you a message`, read: false });
  }
  await emailProfile(sb, String(toId), "New message on Muse ✦", "You have a new message", `${profile.name} sent you a message.`, "Read it", "https://muse.wyzdesign.com/muse", "message");
  return NextResponse.json({ success: true, match_id: matchId });
};
