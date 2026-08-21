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

const FROM = "Muse <info@wyzdesign.com>";
const RESEND_URL = "https://api.resend.com/emails";

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

const SHELL = (inner: string) => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0a0612;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="text-align:center;padding:24px 0 8px;">
        <span style="font-size:28px;font-weight:800;letter-spacing:1px;color:#ffd700;">Muse<span style="color:#d4a5ff;">✦</span></span>
      </div>
      ${inner}
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;font-size:12px;color:rgba(255,255,255,0.4);line-height:1.7;">
        You're receiving this because you're on Muse's list.<br/>
        Built by WYZ Design · <a href="https://muse.wyzdesign.com/muse/terms" style="color:#ffd700;text-decoration:none;">Terms</a> · <a href="https://muse.wyzdesign.com/muse/privacy" style="color:#ffd700;text-decoration:none;">Privacy</a>
      </div>
    </div>
  </body>
</html>`;

/* ────────────────────────── Templates ────────────────────────── */

/** Confirmation sent immediately when someone joins the waitlist. */
export function waitlistWelcome(email: string, source?: string): EmailMessage {
  const html = SHELL(`
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,215,0,0.2);border-radius:16px;padding:32px 28px;">
      <h1 style="font-size:22px;color:#fff;margin:0 0 12px;text-align:center;">You're on the list ✦</h1>
      <p style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.7;margin:0 0 24px;text-align:center;">
        Thanks for joining. Your spot is reserved — we'll let you know the moment it's your turn.
      </p>

      <div style="margin:0 0 22px;">
        <h2 style="font-size:15px;color:#ffd700;margin:0 0 8px;">What Muse is</h2>
        <p style="font-size:14px;color:rgba(255,255,255,0.72);line-height:1.7;margin:0;">
          Muse is a creative professional network. Photographers, models, filmmakers, musicians, designers — people who make things — use it to find each other, collaborate, and book real work. Think of it as the place your portfolio meets the people who want to hire it.
        </p>
      </div>

      <div style="margin:0 0 22px;">
        <h2 style="font-size:15px;color:#ffd700;margin:0 0 8px;">How it works</h2>
        <p style="font-size:14px;color:rgba(255,255,255,0.72);line-height:1.7;margin:0;">
          You build a profile, pick what kind of work you're into, and Muse matches you with the right people. Browse their work, message them, and book sessions — all in one place. No cold DMs, no endless scrolling through people who don't fit.
        </p>
      </div>

      <div style="margin:0 0 22px;">
        <h2 style="font-size:15px;color:#ffd700;margin:0 0 8px;">What you'll do</h2>
        <p style="font-size:14px;color:rgba(255,255,255,0.72);line-height:1.7;margin:0;">
          When your spot opens, you'll create an account and set up your profile — your name, what you do, a few photos, and what kind of collaborations you're after. It takes a few minutes, and it's how matches get made.
        </p>
      </div>

      <div style="margin:0 0 24px;">
        <h2 style="font-size:15px;color:#ffd700;margin:0 0 8px;">What you can expect from us</h2>
        <p style="font-size:14px;color:rgba(255,255,255,0.72);line-height:1.7;margin:0;">
          Safety is the foundation here — verified profiles, disclosure forms, and 24-hour check-ins for in-person work. No spam, ever. Just a note when it's time to join, and a community that takes your craft as seriously as you do.
        </p>
      </div>

      <div style="text-align:center;">
        <a href="https://muse.wyzdesign.com/muse?src=welcome_email" style="display:inline-block;padding:13px 30px;border-radius:12px;background:linear-gradient(120deg,#ffd700,#ff8a80,#d4a5ff);color:#0a0612;font-weight:800;text-decoration:none;font-size:14px;">Create your account</a>
        <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:10px;">Signed up with ${email}</div>
      </div>
    </div>
  `);
  return {
    to: email,
    subject: "You're on the Muse waitlist ✦",
    html,
    text: [
      "Thanks for joining Muse — your spot is reserved.",
      "",
      "What Muse is: a creative professional network where photographers, models, filmmakers, musicians, and designers find each other, collaborate, and book real work.",
      "",
      "How it works: build a profile, pick what work you're into, and Muse matches you with the right people. Browse their work, message them, and book sessions — all in one place.",
      "",
      "When your spot opens you'll create an account and set up your profile — name, what you do, a few photos, and the collaborations you're after. It takes a few minutes.",
      "",
      "Safety is our foundation: verified profiles, disclosure forms, and 24-hour check-ins for in-person work. No spam, ever.",
      "",
      "Create your account: https://muse.wyzdesign.com/muse?src=welcome_email",
    ].join("\n"),
  };
}

/** Sent when a user reaches the front of the line / gets beta access. */
export function betaAccess(email: string): EmailMessage {
  const html = SHELL(`
    <div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.35);border-radius:16px;padding:32px 28px;text-align:center;">
      <h1 style="font-size:22px;color:#ffd700;margin:0 0 12px;">Your Muse access is ready</h1>
      <p style="font-size:15px;color:rgba(255,255,255,0.8);line-height:1.7;margin:0 0 20px;">
        It's time to find your muse.<br/>Head to the app and set up your profile to start matching.
      </p>
      <a href="https://muse.wyzdesign.com/muse" style="display:inline-block;padding:13px 28px;border-radius:12px;background:linear-gradient(120deg,#ffd700,#ff8a80,#d4a5ff);color:#0a0612;font-weight:800;text-decoration:none;">Enter Muse</a>
    </div>
  `);
  return {
    to: email,
    subject: "Your Muse access is ready ✦",
    html,
    text: "Your Muse access is ready. Head to https://muse.wyzdesign.com/muse to set up your profile.",
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
    <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.3);border-radius:16px;padding:32px 28px;text-align:center;">
      <h1 style="font-size:22px;color:#ffd700;margin:0 0 12px;">Welcome to Muse, ${who} ✦</h1>
      <p style="font-size:15px;color:rgba(255,255,255,0.8);line-height:1.7;margin:0 0 20px;">
        Your account is live. Set up your profile, pick what kind of work you're into, and start matching with creatives who get it.
      </p>
      <a href="https://muse.wyzdesign.com/muse" style="display:inline-block;padding:13px 28px;border-radius:12px;background:linear-gradient(120deg,#ffd700,#ff8a80,#d4a5ff);color:#0a0612;font-weight:800;text-decoration:none;">Finish your profile</a>
    </div>
  `);
  return {
    to: email,
    subject: "Welcome to Muse ✦",
    html,
    text: "Welcome to Muse! Your account is live. Set up your profile and start matching with creatives: https://muse.wyzdesign.com/muse",
  };
}

/** Generic notification for events: match, message, booking, verification, etc. */
export function notify(email: string, subject: string, title: string, body: string, ctaLabel?: string, ctaUrl?: string): EmailMessage {
  const cta = ctaLabel && ctaUrl
    ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:20px;padding:12px 26px;border-radius:12px;background:linear-gradient(120deg,#ffd700,#ff8a80,#d4a5ff);color:#0a0612;font-weight:800;text-decoration:none;">${ctaLabel}</a>`
    : "";
  const html = SHELL(`
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px 28px;text-align:center;">
      <h1 style="font-size:20px;color:#fff;margin:0 0 12px;">${title}</h1>
      <p style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.7;margin:0;">${body}</p>
      ${cta}
    </div>
  `);
  return { to: email, subject, html, text: body };
}
