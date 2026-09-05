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
  let query = sb.from("muse_notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (unreadOnly) query = query.eq("read", false);
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) return safeServerError(error, "notifications fetch");
  return NextResponse.json({ success: true, notifications: data || [] });
}

export async function feedbackMarkAllRead({ sb, profile }: ActionContext) {
  const { error } = await sb.from("muse_notifications").update({ read: true }).eq("user_id", profile.id).eq("read", false);
  if (error) return safeServerError(error, "mark all read");
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
