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
