// ══════════════════════════════════════════════════════════════════════════════
// MUSE ACTIONS — NOTIFICATIONS + FEEDBACK
// Extracted from api/muse/route.ts (monolith). Handlers are exported functions;
// the monolith's ACTIONS registry still dispatches them, so POST URL / frontend
// call sites are UNCHANGED. Phase-1 decoupling: code leaves the monolith file,
// the dispatch wiring stays put and safe.
// ══════════════════════════════════════════════════════════════════════════════
import { NextResponse } from "next/server";
import { checkRateUser } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/http";
import { sanitizeText } from "@/lib/request-safety";
import { sendEmail } from "@/lib/email";
import type { ActionContext } from "./shared";

export async function feedbackGetNotifications({ sb, profile, rest }: ActionContext) {
  const { limit = 50, offset = 0, unreadOnly = false, type } = rest;
  // Join from_id -> the sender's real name/avatar. The table only stores from_id
  // (a UUID), but the frontend renders a.from/a.avatar directly — without this join
  // every notification silently had no name and fell back to a blank "letter A"
  // avatar (NotificationAvatar's default when name is missing), regardless of who
  // actually sent it. That was the "confusing 3 items with a blank A avatar" bug.
  let query = sb.from("muse_notifications").select("*, from_id(name, avatar)").eq("user_id", profile.id).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (unreadOnly) query = query.eq("read", false);
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) return safeServerError(error, "notifications fetch");
  // System notifications have no from_id (quest rewards, welcome, admin, etc).
  // Previously every one of those fell back to `name: "Muse", avatar: ""`, so the
  // Activity tabs (every sub-tab but Unread) rendered a generic "M" avatar for
  // everything. Map the notification `type` to a meaningful sender label + a
  // themed avatar letter so these read as real, distinct items.
  const SYSTEM_META: Record<string, { label: string; letter: string }> = {
    quest: { label: "Muse Quest", letter: "Q" },
    quest_complete: { label: "Muse Quest", letter: "Q" },
    reward: { label: "Muse Rewards", letter: "R" },
    streak: { label: "Muse Streak", letter: "🔥" },
    suspension: { label: "Muse Safety", letter: "S" },
    strike: { label: "Muse Safety", letter: "S" },
    account: { label: "Muse", letter: "M" },
    boost: { label: "Muse Boost", letter: "⚡" },
    pro: { label: "Muse Pro", letter: "P" },
  };
  const notifications = (data || []).map((n: any) => {
    const meta = SYSTEM_META[n.type as string] || { label: "Muse", letter: "M" };
    return {
      ...n,
      from: n.from_id?.name || meta.label,
      avatar: n.from_id?.avatar || "",
      _systemAvatar: n.from_id ? undefined : meta.letter,
    };
  });
  return NextResponse.json({ success: true, notifications });
}

export async function feedbackMarkAllRead({ sb, profile }: ActionContext) {
  const { error } = await sb.from("muse_notifications").update({ read: true }).eq("user_id", profile.id).eq("read", false);
  if (error) return safeServerError(error, "mark all read");
  return NextResponse.json({ success: true });
}

export async function feedbackDeleteNotification({ sb, profile, rest }: ActionContext) {
  const id = rest.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  // Only the owner can delete their own notification — scope by user_id so a
  // guessed foreign id can't remove someone else's row.
  const { error } = await sb.from("muse_notifications").delete().eq("user_id", profile.id).eq("id", id);
  if (error) return safeServerError(error, "delete notification");
  return NextResponse.json({ success: true });
}

export async function feedbackReportBug({ sb, profile, rest }: ActionContext) {
  if (!await checkRateUser(profile.id, "report-bug", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { category, description, steps, expected, actual } = rest;
  if (!category || !description) return NextResponse.json({ error: "category and description required" }, { status: 400 });
  const safeCategory = sanitizeText(String(category), 50);
  const safeDesc = sanitizeText(String(description), 2000);
  const safeSteps = sanitizeText(String(steps || ""), 2000);
  const safeExpected = sanitizeText(String(expected || ""), 1000);
  const safeActual = sanitizeText(String(actual || ""), 1000);
  const { error } = await sb.from("muse_activity_log").insert({
    user_id: profile.id,
    action: "bug-report",
    details: { category: safeCategory, description: safeDesc, steps: safeSteps, expected: safeExpected, actual: safeActual },
  });
  if (error) return safeServerError(error, "log bug report");
  const ADMIN_EMAIL = "info@wyzdesign.com";
  const subject = `[Muse Bug] ${safeCategory}`;
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2 style="color:#FF69B4">Bug Report</h2>
    <p><strong>From:</strong> ${profile.name || "Unknown"} (${profile.id})</p>
    <p><strong>Category:</strong> ${safeCategory}</p>
    <p><strong>Description:</strong></p><p>${safeDesc.replace(/\n/g, "<br>")}</p>
    ${safeSteps ? `<p><strong>Steps to reproduce:</strong></p><p>${safeSteps.replace(/\n/g, "<br>")}</p>` : ""}
    ${safeExpected ? `<p><strong>Expected:</strong> ${safeExpected}</p>` : ""}
    ${safeActual ? `<p><strong>Actual:</strong> ${safeActual}</p>` : ""}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#999;font-size:12px">Muse Bug Report System</p>
  </div>`;
  sendEmail({ to: ADMIN_EMAIL, subject, html }).catch(() => {});
  return NextResponse.json({ success: true });
}

export async function feedbackSubmitIdea({ sb, profile, rest }: ActionContext) {
  if (!await checkRateUser(profile.id, "submit-idea", 5)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { title, description, category } = rest;
  if (!title || !description) return NextResponse.json({ error: "title and description required" }, { status: 400 });
  const safeTitle = sanitizeText(String(title), 200);
  const safeDesc = sanitizeText(String(description), 2000);
  const safeCategory = sanitizeText(String(category || "general"), 50);
  const { error } = await sb.from("muse_activity_log").insert({
    user_id: profile.id,
    action: "idea-submission",
    details: { title: safeTitle, description: safeDesc, category: safeCategory },
  });
  if (error) return safeServerError(error, "log idea submission");
  const ADMIN_EMAIL = "info@wyzdesign.com";
  const subject = `[Muse Idea] ${safeTitle}`;
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2 style="color:#FFD700">Feature Idea</h2>
    <p><strong>From:</strong> ${profile.name || "Unknown"} (${profile.id})</p>
    <p><strong>Category:</strong> ${safeCategory}</p>
    <p><strong>Title:</strong> ${safeTitle}</p>
    <p><strong>Description:</strong></p><p>${safeDesc.replace(/\n/g, "<br>")}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#999;font-size:12px">Muse Feature Idea System</p>
  </div>`;
  sendEmail({ to: ADMIN_EMAIL, subject, html }).catch(() => {});
  return NextResponse.json({ success: true });
}
