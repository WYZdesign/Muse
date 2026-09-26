/**
 * Muse email module — single source of truth for all outbound email.
 *
 * Provider: Resend (https://resend.com) via raw REST API — no SDK dependency.
 * Sender: info@wyzdesign.com (owner's current sending address).
 *
 * DESIGN RULES
 *  - Fail-open: email delivery must NEVER break the main user flow. Every
 *    call here swallows errors and logs them; callers never await-block on it.
 *  - One `sendEmail()` entry point; per-message templates below.
 *  - Missing RESEND_API_KEY = no-op (logs a warning once, returns { sent:false }).
 *
 * To activate: set RESEND_API_KEY in Vercel + verify the wyzdesign.com domain
 * in Resend (add SPF/DKIM DNS records), then send from info@wyzdesign.com.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { getMuseUrl, getTermsUrl, getPrivacyUrl, getLandingUrl } from "@/lib/urls";

const FROM = "Muses by WYZ <info@wyzdesign.com>";
const RESEND_URL = "https://api.resend.com/emails";

/** Signed unsubscribe token — HMAC(email) so links can't be forged for others. */
function unsubscribeToken(email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || process.env.NEXTAUTH_SECRET || "";
  return createHmac("sha256", secret || "muse-unsub-fallback").update(email.toLowerCase()).digest("base64url").slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false;
  const expected = unsubscribeToken(email);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

function unsubscribeUrl(email: string): string {
  return `${getMuseUrl()}/api/muse/unsubscribe?email=${encodeURIComponent(email)}&t=${encodeURIComponent(unsubscribeToken(email))}`;
}

let warnedMissingKey = false;

function apiKey(): string {
  return process.env.RESEND_API_KEY || "";
}

export interface SendResult {
  sent: boolean;
  error?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Core sender. Returns a result object; never throws.
 */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const key = apiKey();
  if (!key) {
    if (!warnedMissingKey) {
      console.warn("[email] RESEND_API_KEY not set — email delivery disabled (fail-open).");
      warnedMissingKey = true;
    }
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const unsub = unsubscribeUrl(msg.to);
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        headers: {
          "List-Unsubscribe": `<${unsub}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend returned ${res.status}: ${body.slice(0, 300)}`);
      return { sent: false, error: `resend_${res.status}` };
    }

    return { sent: true };
  } catch (err) {
    console.error("[email] send failure:", err);
    return { sent: false, error: "send_failure" };
  }
}

/* ────────────────────────── Shared layout ────────────────────────── */

/**
 * Email-client-safe CTA button. Outlook (and several mobile clients) ignore
 * `linear-gradient`, so a solid `bgcolor` is declared first and the gradient is
 * layered on via `background-image` for clients that support it. Table-based so
 * the padding survives Outlook's Word renderer.
 */
function ctaButton(label: string, href: string, marginTop = 20): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:${marginTop}px auto 0;">
      <tr>
        <td align="center" bgcolor="#ffd700" style="border-radius:12px;background-color:#ffd700;background-image:linear-gradient(120deg,#ffd700,#ff8a80,#d4a5ff);">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 30px;border-radius:12px;font-weight:800;font-size:14px;line-height:1;color:#0a0612;text-decoration:none;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

/**
 * Table-based shell. Body background is repeated on an outer `<table bgcolor>`
 * because Gmail/Outlook strip `body{background}`. `preheader` is the hidden
 * inbox-preview line. Hex colours only (no rgba) for Outlook.
 */
const SHELL = (inner: string, email?: string, preheader?: string) => `
<!doctype html>
<html lang="en" style="-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>Muses by WYZ</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0a0612;">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0a0612;font-size:1px;line-height:1px;">${escapeHtml(preheader)}</div>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0612;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;">
            <tr>
              <td align="center" style="padding:32px 20px 8px;font-size:28px;font-weight:800;letter-spacing:1px;color:#ffd700;">
                Muses by WYZ<span style="color:#d4a5ff;">&#10022;</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 20px 32px;">
                ${inner}
              </td>
            </tr>
            <tr>
              <td style="padding:20px;border-top:1px solid #241b36;text-align:center;font-size:12px;color:#8b8299;line-height:1.7;">
                You're receiving this because you're on the Muses by WYZ list.<br/>
                Built by WYZ Design &middot; <a href="${getTermsUrl()}" style="color:#ffd700;text-decoration:none;">Terms</a> &middot; <a href="${getPrivacyUrl()}" style="color:#ffd700;text-decoration:none;">Privacy</a>${email ? ` &middot; <a href="${unsubscribeUrl(email)}" style="color:#ffd700;text-decoration:none;">Unsubscribe</a>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

/* ────────────────────────── Templates ────────────────────────── */

/** Confirmation sent immediately when someone joins the waitlist. */
export function waitlistWelcome(email: string, source?: string): EmailMessage {
  const html = SHELL(`
    <div style="background:#141020;border:1px solid #4a3f14;border-radius:16px;padding:32px 28px;">
      <h1 style="font-size:22px;color:#fff;margin:0 0 12px;text-align:center;">You're on the list ✦</h1>
      <p style="font-size:15px;color:#bfbacb;line-height:1.7;margin:0 0 24px;text-align:center;">
        Thanks for joining. Your spot is reserved — we'll let you know the moment it's your turn.
      </p>

      <div style="margin:0 0 22px;">
        <h2 style="font-size:15px;color:#ffd700;margin:0 0 8px;">What Muses by WYZ is</h2>
        <p style="font-size:14px;color:#b8b3c4;line-height:1.7;margin:0;">
          Muses by WYZ is a creative professional network. Photographers, models, filmmakers, musicians, designers — people who make things — use it to find each other, collaborate, and book real work. Think of it as the place your portfolio meets the people who want to hire it.
        </p>
      </div>

      <div style="margin:0 0 22px;">
        <h2 style="font-size:15px;color:#ffd700;margin:0 0 8px;">How it works</h2>
        <p style="font-size:14px;color:#b8b3c4;line-height:1.7;margin:0;">
          You build a profile, pick what kind of work you're into, and Muses by WYZ matches you with the right people. Browse their work, message them, and book sessions — all in one place. No cold DMs, no endless scrolling through people who don't fit.
        </p>
      </div>

      <div style="margin:0 0 22px;">
        <h2 style="font-size:15px;color:#ffd700;margin:0 0 8px;">What you'll do</h2>
        <p style="font-size:14px;color:#b8b3c4;line-height:1.7;margin:0;">
          When your spot opens, you'll create an account and set up your profile — your name, what you do, a few photos, and what kind of collaborations you're after. It takes a few minutes, and it's how matches get made.
        </p>
      </div>

      <div style="margin:0 0 24px;">
        <h2 style="font-size:15px;color:#ffd700;margin:0 0 8px;">What you can expect from us</h2>
        <p style="font-size:14px;color:#b8b3c4;line-height:1.7;margin:0;">
          Safety is the foundation here — verified profiles, disclosure forms, and 24-hour check-ins for in-person work. No spam, ever. Just a note when it's time to join, and a community that takes your craft as seriously as you do.
        </p>
      </div>

      <div style="background:#1f1a08;border:1px solid #3a3110;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
        <h2 style="font-size:14px;color:#ffd700;margin:0 0 8px;">What happens next?</h2>
        <p style="font-size:13px;color:#b3aec0;line-height:1.7;margin:0;">
          We're onboarding the first 150 founding members now. You'll get an email when it's your turn — that's your invite to create an account, set up your profile, and start matching. Founding members get lifetime Pro free.
        </p>
      </div>

      <div style="text-align:center;">
        ${ctaButton("Create your account", `${getMuseUrl()}?src=welcome_email`, 0)}
        <div style="font-size:12px;color:#8b8299;margin-top:10px;">Signed up with ${escapeHtml(email)}</div>
      </div>
    </div>
  `, email, "Your spot is reserved — here's what Muses by WYZ is and what happens next.");
  return {
    to: email,
    subject: "You're on the Muses by WYZ waitlist ✦",
    html,
    text: [
      "Thanks for joining Muses by WYZ — your spot is reserved.",
      "",
      "What Muses by WYZ is: a creative professional network where photographers, models, filmmakers, musicians, and designers find each other, collaborate, and book real work.",
      "",
      "How it works: build a profile, pick what work you're into, and Muses by WYZ matches you with the right people. Browse their work, message them, and book sessions — all in one place.",
      "",
      "When your spot opens you'll create an account and set up your profile — name, what you do, a few photos, and the collaborations you're after. It takes a few minutes.",
      "",
      "Safety is our foundation: verified profiles, disclosure forms, and 24-hour check-ins for in-person work. No spam, ever.",
      "",
      "What happens next: we're onboarding the first 150 founding members now. You'll get an email when it's your turn. Founding members get lifetime Pro free.",
      "",
      "Create your account: " + getMuseUrl() + "?src=welcome_email",
      "",
      "Unsubscribe: " + unsubscribeUrl(email),
    ].join("\n"),
  };
}

/** Sent when a user reaches the front of the line / gets beta access. */
export function betaAccess(email: string): EmailMessage {
  const html = SHELL(`
    <div style="background:#241f0a;border:1px solid #6b5a1c;border-radius:16px;padding:32px 28px;text-align:center;">
      <h1 style="font-size:22px;color:#ffd700;margin:0 0 12px;">Your Muses by WYZ access is ready</h1>
      <p style="font-size:15px;color:#ccc7d6;line-height:1.7;margin:0 0 20px;">
        It's time to find your muse.<br/>Head to the app and set up your profile to start matching.
      </p>
      ${ctaButton("Enter Muses", getMuseUrl(), 4)}
    </div>
  `, email, "Your Muses by WYZ access is ready — set up your profile and start matching.");
  return {
    to: email,
    subject: "Your Muses by WYZ access is ready ✦",
    html,
    text: "Your Muses by WYZ access is ready. Head to " + getMuseUrl() + " to set up your profile.",
  };
}

/** Fire-and-forget send — swallows errors so email never blocks a user flow. */
export function trySend(msg: EmailMessage): void {
  sendEmail(msg).catch(() => {});
}

/** Welcome sent immediately when a user creates an account (not waitlist). */
export function signupWelcome(email: string, name?: string): EmailMessage {
  const who = name && name.trim() ? name.trim() : "there";
  const html = SHELL(`
    <div style="background:#1f1a08;border:1px solid #5c4e18;border-radius:16px;padding:32px 28px;text-align:center;">
      <h1 style="font-size:22px;color:#ffd700;margin:0 0 12px;">Welcome to Muses, ${escapeHtml(who)} ✦</h1>
      <p style="font-size:15px;color:#ccc7d6;line-height:1.7;margin:0 0 20px;">
        Your account is live. Here's what to do next:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr><td width="24" valign="top" style="font-size:16px;color:#ffd700;padding:0 0 10px;">1.</td><td valign="top" style="font-size:14px;color:#bfbacb;line-height:1.5;padding:0 0 10px;">Add your name, location, and a short bio</td></tr>
        <tr><td width="24" valign="top" style="font-size:16px;color:#ffd700;padding:0 0 10px;">2.</td><td valign="top" style="font-size:14px;color:#bfbacb;line-height:1.5;padding:0 0 10px;">Pick your creative type and what kind of work you're into</td></tr>
        <tr><td width="24" valign="top" style="font-size:16px;color:#ffd700;padding:0 0 10px;">3.</td><td valign="top" style="font-size:14px;color:#bfbacb;line-height:1.5;padding:0 0 10px;">Upload a profile photo and portfolio</td></tr>
        <tr><td width="24" valign="top" style="font-size:16px;color:#ffd700;padding:0 0 10px;">4.</td><td valign="top" style="font-size:14px;color:#bfbacb;line-height:1.5;padding:0 0 10px;">Take the personality tests (zodiac, MBTI) for better matches</td></tr>
        <tr><td width="24" valign="top" style="font-size:16px;color:#ffd700;">5.</td><td valign="top" style="font-size:14px;color:#bfbacb;line-height:1.5;">Start swiping — matches happen when you're both into it</td></tr>
      </table>
      ${ctaButton("Finish your profile", getMuseUrl(), 0)}
    </div>
  `, email, "Your account is live — here are the 5 steps to finish your profile.");
  return {
    to: email,
    subject: "Welcome to Muses ✦",
    html,
    text: [
      "Welcome to Muses! Your account is live.",
      "",
      "Here's what to do next:",
      "1. Add your name, location, and a short bio",
      "2. Pick your creative type and what kind of work you're into",
      "3. Upload a profile photo and portfolio",
      "4. Take the personality tests (zodiac, MBTI) for better matches",
      "5. Start swiping — matches happen when you're both into it",
      "",
      "Finish your profile: " + getMuseUrl(),
    ].join("\n"),
  };
}

/** Generic notification for events: match, message, booking, verification, etc. */
export function notify(email: string, subject: string, title: string, body: string, ctaLabel?: string, ctaUrl?: string): EmailMessage {
  const cta = ctaLabel && ctaUrl ? ctaButton(ctaLabel, ctaUrl, 20) : "";
  const html = SHELL(`
    <div style="background-color:#141020;border:1px solid #241b36;border-radius:16px;padding:32px 28px;text-align:center;">
      <h1 style="font-size:20px;color:#ffffff;margin:0 0 12px;">${escapeHtml(title)}</h1>
      <p style="font-size:15px;color:#bfbacb;line-height:1.7;margin:0;">${escapeHtml(body)}</p>
      ${cta}
    </div>
  `, email, body);
  return { to: email, subject, html, text: body };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
