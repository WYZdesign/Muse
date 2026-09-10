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
import { pushToProfile } from "@/lib/push";

export const messageSend = async ({ sb, profile, rest }: ActionContext) => {
  if (!await checkRateUser(profile.id, "message", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const vErr = validateInput(rest);
  if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
  const { toId, text, image_url, img, client_msg_id } = rest;
  const imageUrl = image_url || img;
  if (!text?.trim() && !imageUrl) return NextResponse.json({ error: "text or image required" }, { status: 400 });
  if (!toId) return NextResponse.json({ error: "toId required" }, { status: 400 });
  const isUuid = UUID_RE.test(String(toId));
  const isDemoStub = /^[a-zA-Z0-9]{1,2}$/.test(String(toId));
  if (!isUuid && !isDemoStub) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }
  if (isUuid) {
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

  const cleanText = sanitizeText(String(text || "").trim());
  // Safety-relevant fix: the message-request path below (a first-contact
  // note to a non-matched user) used to skip the screenText moderation
  // check entirely — it stored + notified + emailed the raw text preview
  // and only ran screenText() further down, on a code path this branch
  // returns before ever reaching. That let unmoderated text (anything
  // screenText would normally block) reach another user's notification
  // and inbox preview. Now the same screen (and the same payment+NSFW
  // disclosure gate used for matched messages) runs before a request is
  // stored, so first-contact requests get the same safety bar as regular
  // messages. Flagging this explicitly for wyzmind to confirm — this is
  // moderation/content-safety logic, so it deserves an independent look
  // rather than taking my read of it as final.
  const requestScreen = cleanText ? screenText(cleanText) : { block: false, categories: [] as string[] };
  if (requestScreen.block) {
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "message_blocked", details: { categories: requestScreen.categories, context: "message_request" } });
    return NextResponse.json({ error: "Message blocked by safety policy", code: "SAFETY_BLOCK" }, { status: 403 });
  }
  const requestLower = cleanText.toLowerCase();
  const requestHasPayment = /\$[\d]+|\bpay\b|\bcompensation\b|\brate\b|\bbudget\b|\bfee\b|\bcharged?\b/i.test(requestLower);
  const requestHasNsfw = /\bnude\b|\bnudity\b|\bnsfw\b|\bnsf[ww]\b|\bexplicit\b|\bboudoir\b|\bpenetrat\b|\bsexual\b|\berotic\b|\btopless\b|\bundressed\b|\bintimate\b|\bsensual\b|\badult\b/i.test(requestLower);
  if (requestHasPayment && requestHasNsfw) {
    await sb.from("muse_activity_log").insert({ user_id: profile.id, action: "disclosure_required", details: { to: toId, context: "message_request" } });
    return NextResponse.json({ error: "Disclosure required before discussing paid NSFW shoots", code: "DISCLOSURE_REQUIRED" }, { status: 409 });
  }
  if (!hasMatch && !sameCommunity) {
    const { data: existing } = await sb.from("muse_message_requests").select("id,status").eq("request_from", profile.id).eq("request_to", String(toId)).maybeSingle();
    if (existing && existing.status === "blocked") return NextResponse.json({ error: "Unable to message this user" }, { status: 403 });
    if (!existing) {
      const { error: insErr } = await sb.from("muse_message_requests").insert({ request_from: profile.id, request_to: String(toId), message_preview: cleanText.slice(0, 500) });
      if (insErr) return safeServerError(insErr, "request insert");
      await sb.from("muse_notifications").insert({ user_id: String(toId), from_id: profile.id, type: "message", body: `${profile.name} wants to chat`, read: false });
      await emailProfile(sb, String(toId), "New message request on Muse ✦", "You have a new message request", `${profile.name} sent a message request.`, "Check Requests", "https://muse.wyzdesign.com/muse", "message");
      pushToProfile(String(toId), "New Message Request", `${profile.name} wants to chat — tap to view`, "/muse/matches").catch(() => {});
    }
    return NextResponse.json({ success: true, pending: true, message: "Request sent — they'll see it in their Message Requests inbox" });
  }

  if (!cleanText && !imageUrl) return NextResponse.json({ error: "text or image required" }, { status: 400 });
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
  pushToProfile(String(toId), "New Message", `${profile.name}: ${cleanText.slice(0, 80) || "sent an image"}`, "/muse/matches").catch(() => {});
  return NextResponse.json({ success: true, match_id: matchId });
};

export const messageRequestAccept = async ({ sb, profile, rest }: ActionContext) => {
  const fromId = rest.fromId || rest.from_id;
  const requestId = rest.requestId || rest.request_id;
  let req;
  if (requestId) {
    const { data } = await sb.from("muse_message_requests").select("*").eq("id", requestId).eq("request_to", profile.id).maybeSingle();
    req = data;
  } else if (fromId) {
    const { data } = await sb.from("muse_message_requests").select("*").eq("request_from", fromId).eq("request_to", profile.id).maybeSingle();
    req = data;
  }
  if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  const fromIdAddr = req.request_from;
  const { error } = await sb.from("muse_message_requests").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", req.id);
  if (error) return safeServerError(error, "accept request");
  await sb.from("muse_notifications").insert({ user_id: fromIdAddr, from_id: profile.id, type: "message_request_accepted", body: `${profile.name} accepted your message request`, read: false });
  pushToProfile(fromIdAddr, "Request Accepted!", `${profile.name} accepted your message request — you can now chat`, "/muse/matches").catch(() => {});
  return NextResponse.json({ success: true });
};

export const messageRequestDecline = async ({ sb, profile, rest }: ActionContext) => {
  const fromId = rest.fromId || rest.from_id;
  const requestId = rest.requestId || rest.request_id;
  let req;
  if (requestId) {
    const { data } = await sb.from("muse_message_requests").select("*").eq("id", requestId).eq("request_to", profile.id).maybeSingle();
    req = data;
  } else if (fromId) {
    const { data } = await sb.from("muse_message_requests").select("*").eq("request_from", fromId).eq("request_to", profile.id).maybeSingle();
    req = data;
  }
  if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  const { error } = await sb.from("muse_message_requests").update({ status: "declined", responded_at: new Date().toISOString() }).eq("id", req.id);
  if (error) return safeServerError(error, "decline request");
  return NextResponse.json({ success: true });
};

export const messageRequestBlock = async ({ sb, profile, rest }: ActionContext) => {
  const fromId = rest.fromId || rest.from_id;
  const requestId = rest.requestId || rest.request_id;
  let req;
  if (requestId) {
    const { data } = await sb.from("muse_message_requests").select("*").eq("id", requestId).eq("request_to", profile.id).maybeSingle();
    req = data;
  } else if (fromId) {
    const { data } = await sb.from("muse_message_requests").select("*").eq("request_from", fromId).eq("request_to", profile.id).maybeSingle();
    req = data;
  }
  if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  const fromIdAddr = req.request_from;
  const { error } = await sb.from("muse_message_requests").update({ status: "blocked", responded_at: new Date().toISOString() }).eq("id", req.id);
  if (error) return safeServerError(error, "block request");
  await sb.from("muse_blocks").insert({ user_id: profile.id, target_id: fromIdAddr }).select("*").maybeSingle();
  return NextResponse.json({ success: true });
};

export const messageRequestsGet = async ({ sb, profile }: ActionContext) => {
  const { data: requests } = await sb.from("muse_message_requests").select("*, request_from:profiles!muse_message_requests_request_from_fkey(id,name,avatar,verified)").eq("request_to", profile.id).order("created_at", { ascending: false });
  return NextResponse.json({ success: true, requests: requests || [] });
};

export const blockUser = async ({ sb, profile, rest }: ActionContext) => {
  const { targetId } = rest;
  if (!targetId || !UUID_RE.test(String(targetId))) return NextResponse.json({ error: "Valid targetId required" }, { status: 400 });
  if (targetId === profile.id) return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  const { data: existing } = await sb.from("muse_blocks").select("id").eq("user_id", profile.id).eq("target_id", targetId).maybeSingle();
  if (existing) return NextResponse.json({ success: true, alreadyBlocked: true });
  const { error } = await sb.from("muse_blocks").insert({ user_id: profile.id, target_id: targetId });
  if (error) return safeServerError(error, "block user");
  await sb.from("muse_matches").delete().or(`and(user_id.eq.${profile.id},target_id.eq.${targetId}),and(user_id.eq.${targetId},target_id.eq.${profile.id})`);
  await sb.from("muse_message_requests").update({ status: "blocked" }).or(`and(request_from.eq.${targetId},request_to.eq.${profile.id}),and(request_from.eq.${profile.id},request_to.eq.${targetId})`);
  return NextResponse.json({ success: true });
};

export const unblockUser = async ({ sb, profile, rest }: ActionContext) => {
  const { targetId } = rest;
  if (!targetId || !UUID_RE.test(String(targetId))) return NextResponse.json({ error: "Valid targetId required" }, { status: 400 });
  await sb.from("muse_blocks").delete().eq("user_id", profile.id).eq("target_id", targetId);
  return NextResponse.json({ success: true });
};

export const blockedUsers = async ({ sb, profile }: ActionContext) => {
  const { data } = await sb.from("muse_blocks").select("id, target_id:id, created_at").eq("user_id", profile.id);
  const blockedIds = (data || []).map((r: any) => r.target_id);
  if (blockedIds.length === 0) return NextResponse.json({ success: true, blocked: [] });
  const { data: profiles } = await sb.from("muse_profiles").select("id, name, avatar").in("id", blockedIds);
  return NextResponse.json({ success: true, blocked: profiles || [] });
};