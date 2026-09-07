import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { safeServerError } from "@/lib/http";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { enforceRequestSafety } from "@/lib/request-safety";
import {
  UUID_RE,
  getAuthedProfile, bearerTokenFromReq, isAdminEmail, isConvoParticipant,
  type ActionContext, type ActionHandler,
} from "@/lib/muse-actions/shared";
import { questGetQuests, questTrackQuest, questClaimQuest } from "@/lib/muse-actions/quests";
import { albumCreate, albumUpdate, albumDelete, albumAddPhoto, albumRemovePhoto, albumGrantAccess, albumRevokeAccess, albumListAccess, albumView, albumLike } from "@/lib/muse-actions/albums";
import { feedbackGetNotifications, feedbackMarkAllRead, feedbackReportBug, feedbackSubmitIdea } from "@/lib/muse-actions/feedback";
import { adminResolveAppeal, adminBrain, adminReports, adminStrikes, adminSuspendUser, adminScanNsfw, adminContentScans, adminResolveIncident } from "@/lib/muse-actions/admin";
import { disclosureCreate, disclosureConfirm, disclosureGet, strikesGet, strikeAppeal } from "@/lib/muse-actions/disclosures";
import { communityJoin, communityLeave, communityCreate, eventCreate, eventRsvp, eventCancelRsvp } from "@/lib/muse-actions/communities";
import { sessionBook, sessionCreate, bookingRespond, bookingCancel, bookingComplete, reviewSubmit, checkinRespond, checkinsGet, safetyDetailsShare, safetyProfileSave, safetyProfileGet, promptsGet, promptResponseSave, promptResponsesGet } from "@/lib/muse-actions/sessions";
import { connectRequest } from "@/lib/muse-actions/connect";
import { profileUpdate } from "@/lib/muse-actions/profile";
import { matchCreate, matchDelete, profileViewTrack } from "@/lib/muse-actions/matching";
import { messageSend } from "@/lib/muse-actions/messaging";
import { feedPost, feedPostLike, feedCommentAdd, momentCreate, momentLike, briefCreate, briefApply } from "@/lib/muse-actions/feed";
import { forumDispatch, reportCreate, userBlock, userUnblock, blocksGet } from "@/lib/muse-actions/forum";
import { preferencesSave, promoApply, notificationsMarkRead, clientSync, paymentsGet, searchAll, boostActivate } from "@/lib/muse-actions/misc";

// ══════════════════════════════════════════════════════════════════════════════
// ACTION HANDLER REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

const ACTIONS: Record<string, ActionHandler> = {};

// ═══ PROFILE ═══
// Handler extracted to lib/muse-actions/profile.ts (monolith split, interleaved-domain pass).

ACTIONS["profile"] = profileUpdate;

// ═══ MATCHING & DISCOVERY ═══
// Handlers extracted to lib/muse-actions/matching.ts (monolith split, interleaved-domain pass).

ACTIONS["match"] = matchCreate;
ACTIONS["unmatch"] = matchDelete;
ACTIONS["track-view"] = profileViewTrack;

// ═══ MESSAGING ═══
// Handler extracted to lib/muse-actions/messaging.ts (monolith split, interleaved-domain pass).

ACTIONS["message"] = messageSend;

// ═══ FEED & MOMENTS, BRIEFS ═══
// Handlers extracted to lib/muse-actions/feed.ts (monolith split, interleaved-domain pass).

ACTIONS["feed"] = feedPost;
ACTIONS["like-feed-post"] = feedPostLike;
ACTIONS["feed-comment"] = feedCommentAdd;
ACTIONS["create-moment"] = momentCreate;
ACTIONS["like-moment"] = momentLike;
ACTIONS["brief"] = briefCreate;
ACTIONS["brief-apply"] = briefApply;

// ═══ FORUM, REPORTS & BLOCKS ═══
// Handlers extracted to lib/muse-actions/forum.ts (monolith split, interleaved-domain pass).

ACTIONS["forum"] = forumDispatch;
ACTIONS["report"] = reportCreate;
ACTIONS["block"] = userBlock;
ACTIONS["unblock"] = userUnblock;
ACTIONS["get-blocks"] = blocksGet;

// ═══ COMMUNITIES & EVENTS ═══
// Handlers extracted to lib/muse-actions/communities.ts (monolith split, interleaved-domain pass).

ACTIONS["join-community"] = communityJoin;
ACTIONS["leave-community"] = communityLeave;
ACTIONS["create-community"] = communityCreate;
ACTIONS["create-event"] = eventCreate;
ACTIONS["rsvp"] = eventRsvp;
ACTIONS["cancel-rsvp"] = eventCancelRsvp;

// ═══ SESSIONS & BOOKINGS ═══
// Handlers extracted to lib/muse-actions/sessions.ts (monolith split, interleaved-domain pass).

ACTIONS["book-session"] = sessionBook;
ACTIONS["create-session"] = sessionCreate;

// ═══ CONNECTIONS ═══
// Handler extracted to lib/muse-actions/connect.ts (monolith split, interleaved-domain pass).

ACTIONS["connect"] = connectRequest;

// ═══ PREFERENCES & SYNC ═══
// Handlers extracted to lib/muse-actions/misc.ts (monolith split, interleaved-domain pass).

ACTIONS["save-preferences"] = preferencesSave;
ACTIONS["apply-promo"] = promoApply;
ACTIONS["boost"] = boostActivate;
ACTIONS["mark-read"] = notificationsMarkRead;
ACTIONS["sync"] = clientSync;

// ═══ ALBUMS ═══
// Handlers extracted to lib/muse-actions/albums.ts (monolith decoupling, no dispatch change).

ACTIONS["create-album"] = albumCreate;
ACTIONS["update-album"] = albumUpdate;
ACTIONS["delete-album"] = albumDelete;
ACTIONS["add-album-photo"] = albumAddPhoto;
ACTIONS["remove-album-photo"] = albumRemovePhoto;
ACTIONS["grant-album-access"] = albumGrantAccess;
ACTIONS["revoke-album-access"] = albumRevokeAccess;
ACTIONS["list-album-access"] = albumListAccess;
ACTIONS["view-album"] = albumView;
ACTIONS["like-album"] = albumLike;

// ═══ DISCLOSURES & STRIKES ═══
// Handlers extracted to lib/muse-actions/disclosures.ts (monolith split, interleaved-domain pass).

ACTIONS["create-disclosure"] = disclosureCreate;
ACTIONS["confirm-disclosure"] = disclosureConfirm;
ACTIONS["get-disclosures"] = disclosureGet;
ACTIONS["get-strikes"] = strikesGet;
ACTIONS["appeal-strike"] = strikeAppeal;

// ═══ ADMIN ═══
// Handlers extracted to lib/muse-actions/admin.ts (monolith split, interleaved-domain pass).

ACTIONS["admin-resolve-appeal"] = adminResolveAppeal;

// ═══ BOOKING MANAGEMENT, CHECK-INS, SAFETY PROFILE & PROMPTS ═══
// Handlers extracted to lib/muse-actions/sessions.ts (monolith split, interleaved-domain pass).

ACTIONS["respond-booking"] = bookingRespond;
ACTIONS["cancel-booking"] = bookingCancel;
ACTIONS["complete-booking"] = bookingComplete;
ACTIONS["submit-review"] = reviewSubmit;
ACTIONS["respond-checkin"] = checkinRespond;
ACTIONS["get-checkins"] = checkinsGet;
ACTIONS["share-safety-details"] = safetyDetailsShare;
ACTIONS["save-safety-profile"] = safetyProfileSave;
ACTIONS["get-safety-profile"] = safetyProfileGet;
ACTIONS["get-prompts"] = promptsGet;
ACTIONS["save-prompt-response"] = promptResponseSave;
ACTIONS["get-prompt-responses"] = promptResponsesGet;

ACTIONS["admin-brain"] = adminBrain;

// ═══ PAYMENTS ═══
// Handler extracted to lib/muse-actions/misc.ts (monolith split, interleaved-domain pass).

ACTIONS["get-payments"] = paymentsGet;

ACTIONS["admin-reports"] = adminReports;
ACTIONS["admin-strikes"] = adminStrikes;
ACTIONS["admin-suspend-user"] = adminSuspendUser;
ACTIONS["admin-scan-nsfw"] = adminScanNsfw;

// ═══ QUESTS ═══
// Handlers extracted to lib/muse-actions/quests.ts (monolith decoupling, no dispatch change).

ACTIONS["get-quests"] = questGetQuests;
ACTIONS["track-quest"] = questTrackQuest;
ACTIONS["claim-quest"] = questClaimQuest;

ACTIONS["admin-content-scans"] = adminContentScans;

// Handler extracted to lib/muse-actions/misc.ts (monolith split, interleaved-domain pass).
ACTIONS["search"] = searchAll;

ACTIONS["admin-resolve-incident"] = adminResolveIncident;

ACTIONS["get-notifications"] = feedbackGetNotifications;
ACTIONS["mark-all-notifications-read"] = feedbackMarkAllRead;
ACTIONS["report-bug"] = feedbackReportBug;
ACTIONS["submit-idea"] = feedbackSubmitIdea;

import { GET as getHandler } from "@/lib/muse-actions/get";
export { getHandler as GET };

export async function POST(req: NextRequest) {
  try {
    const safetyErr = await enforceRequestSafety(req);
    if (safetyErr) return safetyErr;

    const body = await req.json();
    const { type: rawType, action: rawAction, ...rest } = body;
    // `action` takes priority over `type` when both are present. The forum
    // sub-actions (get-replies/reply/vote) send both — {action:"forum",
    // type:"<verb>"} — expecting "forum" to route here and "<verb>" to be
    // read as the sub-verb below. The reverse priority made actionType
    // resolve to "reply"/"vote"/"get-replies" directly, matching no
    // top-level branch ("Unknown action type" on every forum reply/vote).
    // Every other call site sends exactly one of the two fields.
    const actionType = rawAction || rawType;

    const ip = clientIp(req);

    // Blanket write-rate ceiling per IP. Per-action limits below are tighter;
    // this catches any action that doesn't have its own check (and throttles
    // brute-force / scripted abuse across the whole write surface).
    if (actionType !== "track-event" && !await checkRate(ip, "write", 120)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    // track-event intentionally allows unauthenticated callers (e.g. an
    // anonymous visitor viewing the auth screen before signing up) — product
    // analytics needs to capture that funnel too, not just logged-in actions.
    if (actionType === "track-event") {
      if (!await checkRate(ip, "track-event", 120)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { name, props } = rest;
      if (!name || typeof name !== "string" || name.length > 100) {
        return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
      }
      const sbEvt = getServiceClient();
      const ua = req.headers.get("user-agent") || "";
      await sbEvt.from("muse_events_log").insert({ name, props: props && typeof props === "object" ? props : {}, ua: ua.slice(0, 300), ip: String(ip).slice(0, 100) });
      return NextResponse.json({ success: true });
    }

    if (actionType === "track-error") {
      if (!await checkRate(ip, "track-error", 60)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      const { name, params, time } = rest;
      const sbErr = getServiceClient();
      await sbErr.from("muse_events_log").insert({
        name: `error:${name || "unknown"}`,
        props: { params: params || {}, time: time || new Date().toISOString(), ua: (req.headers.get("user-agent") || "").slice(0, 300) },
      });
      return NextResponse.json({ success: true });
    }

    const { user, profile } = await getAuthedProfile(req, body);
    if (!user || !profile) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Enforcement: suspended accounts are locked out of all mutating actions.
    if ((profile as any).suspended) {
      return NextResponse.json({ error: "Account suspended", code: "ACCOUNT_SUSPENDED" }, { status: 403 });
    }

    const sb = getServiceClient();
    const handler = ACTIONS[actionType];
    if (!handler) return NextResponse.json({ error: "Unknown action type" }, { status: 400 });

    return await handler({ sb, profile: profile as ActionContext["profile"], rest, ip, req, rawType });
  } catch (e: unknown) {
    return safeServerError(e, "muse route");
  }
}

