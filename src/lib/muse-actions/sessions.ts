// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — SESSIONS, BOOKINGS, CHECK-INS, SAFETY PROFILE & PROMPTS
// Extracted from api/muse/route.ts (monolith split, interleaved-domain pass).
// This is the "sessions/bookings" cluster from the handoff — bookings, their
// lifecycle (respond/cancel/complete/review), the safety check-ins and safety
// shares tied to a booking, the standalone safety profile, and the prompt
// bank/responses used for profile completion. Handlers are exported functions;
// the monolith's ACTIONS registry still dispatches them under the same action
// names, so the POST URL and every frontend call site are UNCHANGED. Pure
// relocation — no behavior change.
// ══════════════════════════════════════════════════════════════════════════════
import { checkRate, checkRateUser } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/request-safety";
import { sendEmail, notify } from "@/lib/email";
import { parseRateToCents } from "@/lib/money";
import { bumpQuest } from "@/lib/questEngine";
import Stripe from "stripe";
import { UUID_RE, emailProfile, NextResponse, safeServerError, type ActionContext } from "./shared";

export const sessionBook = async ({ sb, profile, rest }: ActionContext) => {
  if (!await checkRateUser(profile.id, "book-session", 15)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { sessionId } = rest;
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  const { data: booker } = await sb.from("muse_profiles").select("age_verified").eq("id", profile.id).maybeSingle();
  if (!booker?.age_verified) {
    return NextResponse.json({ error: "Identity verification required", code: "VERIFICATION_REQUIRED" }, { status: 403 });
  }
  if (!UUID_RE.test(String(sessionId))) return NextResponse.json({ success: true, demo: true });
  const { data: session } = await sb.from("muse_sessions").select("id, host_id").eq("id", sessionId).maybeSingle();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 400 });
  // Use the session's own host_id — never trust client-supplied hostId
  const effectiveHostId = (session as any).host_id || null;
  if (effectiveHostId) {
    const { data: host } = await sb.from("muse_profiles").select("id").eq("id", effectiveHostId).maybeSingle();
    if (!host) return NextResponse.json({ error: "Host not found" }, { status: 400 });
  }
  await sb.from("muse_bookings").upsert(
    { session_id: sessionId, user_id: profile.id, user_name: profile.name, user_avatar: profile.avatar, host_id: effectiveHostId, status: "pending" },
    { onConflict: "session_id,user_id", ignoreDuplicates: true }
  );
  await sb.from("muse_notifications").insert({ user_id: effectiveHostId || profile.id, from_id: profile.id, type: "booking", body: `${profile.name} requested to book a session`, read: false });
  if (effectiveHostId) await emailProfile(sb, effectiveHostId, "New booking request ✦", "Someone wants to book you", `${profile.name} requested to book one of your sessions.`, "Review booking", "https://muse.wyzdesign.com/muse");
  await bumpQuest(sb, profile.id, "book_session");
  return NextResponse.json({ success: true });
};

export const sessionCreate = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "create-session", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { title, description, type, rate, duration, skills, date, location, img } = rest;
  if (!title || !String(title).trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  const rawRate = String(rate || "").trim();
  if (rawRate && parseRateToCents(rawRate) === null) {
    return NextResponse.json({ error: "Rate must be a single dollar amount (e.g. \"$150\" or \"150\"). Remove ranges or extra text." }, { status: 400 });
  }
  const { data, error } = await sb.from("muse_sessions").insert({
    host_id: profile.id,
    title: sanitizeText(String(title).trim(), 200),
    description: sanitizeText(String(description || ""), 1000),
    type: sanitizeText(String(type || "Photoshoot"), 50),
    rate: sanitizeText(rawRate, 50),
    duration: sanitizeText(String(duration || "60 min"), 50),
    skills: Array.isArray(skills) ? skills.slice(0, 20).map((s: unknown) => sanitizeText(String(s), 50)) : [],
    date: sanitizeText(String(date || ""), 100),
    location: sanitizeText(String(location || ""), 200),
    img: sanitizeText(String(img || ""), 500),
    available: true,
  }).select().single();
  if (error) return safeServerError(error, "db op");
  await bumpQuest(sb, profile.id, "host_session");
  return NextResponse.json({ success: true, session: data });
};

export const bookingRespond = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "respond-booking", 20)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { bookingId, response } = rest;
  if (!bookingId || !response) return NextResponse.json({ error: "bookingId and response required" }, { status: 400 });
  if (!["accept", "decline", "reschedule"].includes(response)) return NextResponse.json({ error: "response must be accept, decline, or reschedule" }, { status: 400 });
  const { data: booking } = await sb.from("muse_bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String(booking.host_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (response === "accept") {
    updates.status = "confirmed";
    updates.confirmed_at = new Date().toISOString();
    await sb.from("muse_safety_checkins").insert({
      booking_id: bookingId, user_id: booking.user_id, checkin_type: "pre_shoot_24h", status: "pending"
    });
    await sb.from("muse_safety_checkins").insert({
      booking_id: bookingId, user_id: profile.id, checkin_type: "pre_shoot_24h", status: "pending"
    });
  } else if (response === "decline") {
    updates.status = "cancelled";
    updates.cancelled_at = new Date().toISOString();
    updates.cancel_reason = "Host declined";
  } else if (response === "reschedule") {
    updates.status = "pending";
    updates.reschedule_date = rest.newDate || "";
  }

  const { error } = await sb.from("muse_bookings").update(updates).eq("id", bookingId);
  if (error) return safeServerError(error, "db op");

  await sb.from("muse_notifications").insert({
    user_id: booking.user_id, from_id: profile.id, type: "booking_update",
    body: `${profile.name} ${response === "accept" ? "accepted" : response === "decline" ? "declined" : "wants to reschedule"} your booking`, read: false
  });
  if (booking.user_id) await emailProfile(sb, booking.user_id, "Booking update ✦", "Your booking was updated", `${profile.name} ${response === "accept" ? "accepted" : response === "decline" ? "declined" : "wants to reschedule"} your booking.`, "View booking", "https://muse.wyzdesign.com/muse");
  return NextResponse.json({ success: true });
};

export const bookingCancel = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "cancel-booking", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { bookingId, reason } = rest;
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  const { data: booking } = await sb.from("muse_bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isParty = String(booking.user_id) === String(profile.id) || String(booking.host_id) === String(profile.id);
  if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: cancelPayment } = await sb.from("muse_booking_payments")
    .select("id, stripe_payment_intent, status").eq("booking_id", bookingId).maybeSingle();
  if (cancelPayment?.stripe_payment_intent && cancelPayment.status !== "succeeded") {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      await stripe.paymentIntents.cancel(cancelPayment.stripe_payment_intent);
      await sb.from("muse_booking_payments").update({ status: "cancelled" }).eq("id", cancelPayment.id);
    } catch (e: unknown) {
      console.error("[cancel-booking] Stripe paymentIntent cancel failed:", e instanceof Error ? e.message : e);
      // Still proceed — booking is cancelled either way, but log for monitoring
    }
  }

  const { error } = await sb.from("muse_bookings").update({
    status: "cancelled", cancelled_at: new Date().toISOString(),
    cancel_reason: String(reason || "Cancelled by user"),
    updated_at: new Date().toISOString()
  }).eq("id", bookingId);
  if (error) return safeServerError(error, "db op");

  const otherUserId = String(booking.user_id) === String(profile.id) ? booking.host_id : booking.user_id;
  if (otherUserId) {
    await sb.from("muse_notifications").insert({
      user_id: otherUserId, from_id: profile.id, type: "booking_cancelled",
      body: `${profile.name} cancelled the booking${reason ? `: ${reason}` : ""}`, read: false
    });
  }
  return NextResponse.json({ success: true });
};

export const bookingComplete = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "complete-booking", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { bookingId } = rest;
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  const { data: booking } = await sb.from("muse_bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isParty = String(booking.user_id) === String(profile.id) || String(booking.host_id) === String(profile.id);
  if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (booking.status !== "confirmed") return NextResponse.json({ error: "Only confirmed bookings can be completed" }, { status: 400 });

  const { data: payments } = await sb.from("muse_booking_payments")
    .select("id, stripe_payment_intent, status").eq("booking_id", bookingId)
    .order("created_at", { ascending: false }).limit(1);
  const payment = payments?.[0];
  let captureSucceeded = payment?.status === "succeeded";
  if (payment?.stripe_payment_intent && payment.status !== "succeeded") {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      await stripe.paymentIntents.capture(payment.stripe_payment_intent);
      await sb.from("muse_booking_payments").update({ status: "succeeded" }).eq("id", payment.id);
      captureSucceeded = true;
    } catch (e: unknown) {
      console.error("[complete-booking] capture failed:", e);
      return NextResponse.json({ error: "Payment capture failed. The booking cannot be completed until payment is resolved." }, { status: 402 });
    }
  }
  if (!payment || captureSucceeded) {
    await sb.from("muse_bookings").update({
      status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq("id", bookingId);
  } else {
    return NextResponse.json({ error: "Payment capture failed. The booking cannot be completed until payment is resolved." }, { status: 402 });
  }

  const otherId = String(booking.user_id) === String(profile.id) ? booking.host_id : booking.user_id;
  if (otherId) {
    await sb.from("muse_notifications").insert({
      user_id: otherId, from_id: profile.id, type: "booking_completed",
      body: `${profile.name} marked the shoot as complete — leave a review`, read: false
    });
  }
  await bumpQuest(sb, String(booking.user_id), "complete_session");
  if (booking.host_id) await bumpQuest(sb, String(booking.host_id), "complete_host");
  return NextResponse.json({ success: true });
};

export const reviewSubmit = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "submit-review", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { bookingId, rating, body } = rest;
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) return NextResponse.json({ error: "rating must be an integer 1-5" }, { status: 400 });
  const { data: booking } = await sb.from("muse_bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status !== "completed") return NextResponse.json({ error: "Only completed bookings can be reviewed" }, { status: 400 });
  const isParty = String(booking.user_id) === String(profile.id) || String(booking.host_id) === String(profile.id);
  if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const revieweeId = String(booking.user_id) === String(profile.id) ? booking.host_id : booking.user_id;
  if (!revieweeId) return NextResponse.json({ error: "No other party to review" }, { status: 400 });
  const { data, error } = await sb.from("muse_reviews").upsert({
    booking_id: bookingId, reviewer_id: profile.id, reviewee_id: revieweeId,
    rating: r, body: String(body || "").slice(0, 1000),
  }, { onConflict: "booking_id,reviewer_id" }).select().single();
  if (error) return safeServerError(error, "db op");
  return NextResponse.json({ success: true, review: data });
};

export const checkinRespond = async ({ sb, profile, rest }: ActionContext) => {
  if (!await checkRateUser(profile.id, "respond-checkin", 15)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { checkinId, response, sharedWithContact } = rest;
  if (!checkinId || !response) return NextResponse.json({ error: "checkinId and response required" }, { status: 400 });
  const { data: checkin } = await sb.from("muse_safety_checkins").select("*").eq("id", checkinId).maybeSingle();
  if (!checkin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String(checkin.user_id) !== String(profile.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: Record<string, unknown> = {
    status: response, responded_at: new Date().toISOString(),
    shared_with_contact: !!sharedWithContact
  };
  if (response === "cancelled") {
    updates.cancelled_at = new Date().toISOString();
    updates.cancel_reason = rest.reason || "Cancelled during check-in";
  }
  const { error } = await sb.from("muse_safety_checkins").update(updates).eq("id", checkinId);
  if (error) return safeServerError(error, "db op");

  if (response === "cancelled" && checkin.booking_id) {
    await sb.from("muse_bookings").update({
      status: "cancelled", cancelled_at: new Date().toISOString(),
      cancel_reason: updates.cancel_reason as string, updated_at: new Date().toISOString()
    }).eq("id", checkin.booking_id);
  }
  return NextResponse.json({ success: true });
};

export const checkinsGet = async ({ sb, profile }: ActionContext) => {
  const { data } = await sb.from("muse_safety_checkins").select("*, booking_id(id, session_id, status)")
    .eq("user_id", profile.id).order("created_at", { ascending: false }).limit(20);
  return NextResponse.json({ checkins: data || [] });
};

export const safetyDetailsShare = async ({ sb, profile, rest }: ActionContext) => {
  const { bookingId, disclosureId, recipientName, recipientPhone, recipientEmail, shareMethod } = rest;
  // Verify caller is a party to the booking (if bookingId provided)
  if (bookingId && UUID_RE.test(String(bookingId))) {
    const { data: bk } = await sb.from("muse_bookings").select("user_id, host_id").eq("id", bookingId).maybeSingle();
    if (bk) {
      const isParty = String(bk.user_id) === String(profile.id) || String(bk.host_id) === String(profile.id);
      if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  const { error } = await sb.from("muse_safety_shares").insert({
    user_id: profile.id, booking_id: bookingId || null, disclosure_id: disclosureId || null,
    recipient_name: String(recipientName || ""),
    recipient_phone: String(recipientPhone || ""),
    recipient_email: String(recipientEmail || ""),
    share_method: String(shareMethod || "sms"),
  });
  if (error) return safeServerError(error, "db op");

  let sessionInfo = "";
  if (bookingId) {
    const { data: bk } = await sb.from("muse_bookings")
      .select("session_id, host_id, user_id")
      .eq("id", bookingId).maybeSingle();
    if (bk) {
      const ids = [bk.host_id, bk.user_id].filter(Boolean);
      const { data: profiles } = await sb.from("muse_profiles").select("id,name").in("id", ids);
      const nameMap = new Map((profiles || []).map((p: { id: string; name: string }) => [p.id, p.name]));
      const hostName = nameMap.get(bk.host_id) || "Unknown";
      const clientName = nameMap.get(bk.user_id) || "Unknown";
      const { data: session } = await sb.from("muse_sessions").select("title,location,date,time").eq("id", bk.session_id).maybeSingle();
      if (session) {
        sessionInfo = `Shoot: ${session.title || "Untitled"} at ${session.location || "TBD"} on ${session.date || "?"} ${session.time || "?"} with ${hostName} (host) and ${clientName} (client).`;
      }
    }
  }

  const safetyBody = `A safety disclosure has been shared by ${profile.name}.\n\nRecipient: ${recipientName || "Not specified"}\nMethod: ${shareMethod || "email"}\n${recipientEmail ? `Email: ${recipientEmail}` : ""}${recipientPhone ? `Phone: ${recipientPhone}` : ""}\n\n${sessionInfo}\n\nThis is an automated safety notification from Muse.`;

  if (recipientEmail) {
    sendEmail(notify(
      recipientEmail,
      `Safety disclosure from ${profile.name}`,
      "Muse Safety Notification",
      safetyBody
    )).catch((e: unknown) => console.error("[share-safety] email dispatch failed:", e));
  }

  if (bookingId) {
    const { data: bk2 } = await sb.from("muse_bookings")
      .select("user_id, host_id").eq("id", bookingId).maybeSingle();
    if (bk2) {
      const otherId = String(bk2.user_id) === String(profile.id) ? bk2.host_id : bk2.user_id;
      if (otherId && String(otherId) !== String(profile.id)) {
        try {
          await sb.from("muse_notifications").insert({
            user_id: otherId, from_id: profile.id, type: "safety_share",
            body: `${profile.name} shared safety details with a trusted contact for this shoot.`, read: false
          });
        } catch { /* non-fatal */ }
      }
    }
  }

  return NextResponse.json({ success: true });
};

export const safetyProfileSave = async ({ sb, profile, rest }: ActionContext) => {
  const { emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    trustedFriendName, trustedFriendPhone, trustedFriendEmail, autoShareEnabled } = rest;
  const { error } = await sb.from("muse_safety_profiles").upsert({
    user_id: profile.id,
    emergency_contact_name: String(emergencyContactName || ""),
    emergency_contact_phone: String(emergencyContactPhone || ""),
    emergency_contact_relation: String(emergencyContactRelation || ""),
    trusted_friend_name: String(trustedFriendName || ""),
    trusted_friend_phone: String(trustedFriendPhone || ""),
    trusted_friend_email: String(trustedFriendEmail || ""),
    auto_share_enabled: !!autoShareEnabled,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return safeServerError(error, "db op");
  await sb.from("muse_profiles").update({ emergency_contact_added: true }).eq("id", profile.id);
  return NextResponse.json({ success: true });
};

export const safetyProfileGet = async ({ sb, profile }: ActionContext) => {
  const { data } = await sb.from("muse_safety_profiles").select("*").eq("user_id", profile.id).maybeSingle();
  return NextResponse.json({ safety: data || null });
};

export const promptsGet = async ({ sb, rest }: ActionContext) => {
  const { category } = rest;
  let query = sb.from("muse_prompt_bank").select("*").eq("active", true).order("display_order");
  if (category) query = query.eq("category", category);
  const { data } = await query.limit(100);
  return NextResponse.json({ prompts: data || [] });
};

export const promptResponseSave = async ({ sb, profile, rest, ip }: ActionContext) => {
  if (!await checkRate(ip, "save-prompt-response", 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { promptId, responseText, responseChoices } = rest;
  if (!promptId) return NextResponse.json({ error: "promptId required" }, { status: 400 });
  const { error } = await sb.from("muse_prompt_responses").upsert({
    user_id: profile.id, prompt_id: promptId,
    response_text: String(responseText || ""),
    response_choices: Array.isArray(responseChoices) ? responseChoices : [],
  }, { onConflict: "user_id,prompt_id" });
  if (error) return safeServerError(error, "db op");
  const { count } = await sb.from("muse_prompt_responses").select("*", { count: "exact", head: true }).eq("user_id", profile.id);
  const { count: total } = await sb.from("muse_prompt_bank").select("*", { count: "exact", head: true }).eq("active", true);
  const pct = total && total > 0 ? Math.round(((count || 0) / total) * 100) : 0;
  await sb.from("muse_profiles").update({ profile_completion_pct: pct, prompt_completed_at: new Date().toISOString() }).eq("id", profile.id);

  if (responseText && typeof responseText === "string" && responseText.trim()) {
    const embedText = `${responseText}`.trim();
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/muse/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "embed-text", text: embedText, userId: profile.id, meta: { embedding_type: "prompt_response", prompt_id: promptId } }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, completionPct: pct });
};

export const promptResponsesGet = async ({ sb, profile }: ActionContext) => {
  const { data } = await sb.from("muse_prompt_responses").select("*, prompt_id(id, prompt_text, category)").eq("user_id", profile.id);
  return NextResponse.json({ responses: data || [] });
};
