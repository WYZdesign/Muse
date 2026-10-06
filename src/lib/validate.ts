import { z } from "zod";

/**
 * Roadmap 1.5 — runtime input validation. Centralised zod schemas + a tiny
 * parse helper so routes validate their JSON body instead of hand-rolling
 * typeof/regex checks. Returns a plain 400-friendly error string.
 */

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Parse `unknown` against a schema, collapsing zod errors to a message. */
export function parseWith<T>(schema: z.ZodType<T>, data: unknown): ParseResult<T> {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.issues[0]?.message || "Invalid input" };
}

/** Practical (not full-RFC) email: non-empty local@domain.tld, bounded length. */
export const emailField = z
  .string({ error: "Valid email required" })
  .trim()
  .min(3, "Valid email required")
  .max(254, "Valid email required")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Valid email required");

export const WaitlistSchema = z.object({
  email: emailField,
  phone: z.string().max(40).nullish(),
  source: z.string().max(64).nullish(),
});
export type WaitlistInput = z.infer<typeof WaitlistSchema>;

/** Support chat question. Accepts either `question` or the short `q` alias. */
export const SupportSchema = z.object({
  question: z.string().max(4000).optional(),
  q: z.string().max(4000).optional(),
});
export type SupportInput = z.infer<typeof SupportSchema>;

/** Referral actions. Codes are normalized/bounded; eligibility is server-derived. */
export const ReferralSchema = z.object({
  action: z.enum(["generate", "apply", "status", "redeem-reward"], { error: "Unknown action" }),
  referralCode: z.string().trim().max(32).optional(),
  referralId: z.union([z.string().max(200), z.number()]).optional(),
});
export type ReferralInput = z.infer<typeof ReferralSchema>;

/** AI embedding actions. Bounds text/vector sizes (embed + batch-embed spend budget). */
export const EmbeddingsSchema = z.object({
  action: z.enum(["embed", "search", "batch-embed", "info"], { error: "Unknown action" }),
  text: z.string().max(8000).optional(),
  texts: z.array(z.string().max(8000)).max(20).optional(),
  vector: z.array(z.number()).max(4096).optional(),
  excludeUserId: z.union([z.string().max(200), z.number()]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  minScore: z.coerce.number().min(0).max(1).optional(),
});
export type EmbeddingsInput = z.infer<typeof EmbeddingsSchema>;

/** Web-push actions. The actor is derived from the access token, not the body. */
export const PushSchema = z.object({
  action: z.enum(["send", "subscribe", "unsubscribe"], { error: "Unknown action" }),
  access_token: z.string().max(4096).optional(),
  userId: z.string().max(200).optional(),
  subscription: z
    .object({
      endpoint: z.string().max(2048).optional(),
      p256dh: z.string().max(2048).optional(),
      auth: z.string().max(2048).optional(),
    })
    .optional(),
  payload: z
    .object({
      title: z.string().max(200),
      body: z.string().max(500),
      icon: z.string().max(2048).optional(),
      data: z.record(z.string(), z.unknown()).optional(),
      actions: z.array(z.unknown()).max(10).optional(),
      tag: z.string().max(100).optional(),
      vibrate: z.array(z.number()).max(10).optional(),
      badge: z.string().max(2048).optional(),
    })
    .optional(),
});
export type PushInput = z.infer<typeof PushSchema>;

/** Stripe checkout body. `plan` must be a known price-map key. */
export const CheckoutSchema = z.object({
  plan: z.enum(["muse_pro", "muse_pro_annual", "muse_studio", "muse", "sovereign"], { error: "Invalid plan" }),
  email: emailField.optional(),
  promo: z.string().max(64).optional(),
  access_token: z.string().max(4096).optional(),
});
export type CheckoutInput = z.infer<typeof CheckoutSchema>;

/** Identity/age verification actions (Stripe Identity). */
export const VerificationSchema = z.object({
  action: z.enum(
    ["create-verification-session", "get-verification-status", "create-age-gate-session"],
    { error: "Invalid action" },
  ),
});
export type VerificationInput = z.infer<typeof VerificationSchema>;

/** MFA (TOTP) actions — security-sensitive, so the action is a closed enum. */
export const MfaSchema = z.object({
  action: z.enum(
    ["enroll", "verify", "verify-code", "unenroll", "challenge", "verify-session"],
    { error: "Unknown action" },
  ),
  factorId: z.string().max(200).optional(),
  code: z.string().max(32).optional(),
  friendlyName: z.string().max(60).optional(),
});
export type MfaInput = z.infer<typeof MfaSchema>;


/** Stripe Connect actions. Inputs are bounded before they reach financial flows. */
export const ConnectSchema = z.object({
  action: z.enum(
    [
      "create-account", "create-account-session", "create-payment", "account-status",
      "transfer", "create-booking-checkout", "create-boost-checkout",
      "request-refund", "cancel-refund-request",
    ],
    { error: "Unknown action" },
  ),
  payeeId: z.string().trim().min(1).max(200).optional(),
  amountCents: z.coerce.number().int().positive().max(10_000_000).optional(),
  description: z.string().trim().max(500).optional(),
  bookingId: z.string().trim().min(1).max(200).optional(),
  quantity: z.coerce.number().int().min(1).max(20).optional(),
  duration: z.enum(["24h", "72h", "7d"]).optional(),
  paymentId: z.string().trim().min(1).max(200).optional(),
  reason: z.string().trim().max(1000).optional(),
  requestId: z.string().trim().min(1).max(200).optional(),
});
export type ConnectInput = z.infer<typeof ConnectSchema>;
/** Owner-only beta promotion accepts one address or a bounded batch. Shape only:
 *  email FORMAT is validated per item in the route so a bad entry in a batch is
 *  reported individually instead of failing the whole request. */
export const AdminPromoteWaitlistSchema = z.union([
  z.object({ email: z.string().trim().min(1).max(254) }),
  z.object({ emails: z.array(z.string()).min(1, "Provide at least one email").max(50, "A maximum of 50 emails can be promoted at once") }),
]);
export type AdminPromoteWaitlistInput = z.infer<typeof AdminPromoteWaitlistSchema>;
