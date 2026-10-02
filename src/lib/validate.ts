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
