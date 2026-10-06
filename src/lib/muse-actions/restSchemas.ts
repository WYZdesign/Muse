import { z } from "zod";

/**
 * Per-action validation for the /api/muse dispatch. The router already validates
 * the envelope (type/action) and a request-size ceiling at the edge; this adds:
 *   1. a prototype-pollution guard on every action,
 *   2. a total payload-size cap,
 *   3. field-level schemas for the high-traffic mutating actions.
 *
 * Every listed schema uses `.passthrough()` so extra/unknown fields are still
 * accepted — the goal is to type + bound the fields we DO know (and reject
 * polluted keys), never to reject a valid request because the shape evolved.
 * Actions not listed here pass through unchanged (still guarded by 1 + 2).
 */

const MAX_REST_BYTES = 50_000;
const POLLUTED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const idLike = z.union([z.string().max(200), z.number()]);
const uuidLike = z.string().regex(UUID_RE, "Invalid id");

export const MUSE_REST_SCHEMAS: Record<string, z.ZodTypeAny> = {
  "track-view": z.object({ target_id: uuidLike }).passthrough(),
  "message": z.object({
    theirId: idLike.optional(),
    text: z.string().max(5000).optional(),
    img: z.string().max(2048).optional(),
    kind: z.enum(["voice", "video"]).optional(),
    mediaUrl: z.string().max(2048).optional(),
    mediaType: z.string().max(120).optional(),
    durationMs: z.number().nonnegative().max(600000).optional(),
    transcript: z.string().max(5000).optional(),
    clientMsgId: z.string().max(120).optional(),
  }).passthrough(),
  "feed": z.object({ text: z.string().max(5000).optional(), img: z.string().max(2048).optional() }).passthrough(),
  "feed-comment": z.object({ postId: idLike.optional(), text: z.string().max(2000).optional() }).passthrough(),
  "create-moment": z.object({ img: z.string().max(2048).optional(), caption: z.string().max(500).optional() }).passthrough(),
  "report": z.object({ targetType: z.string().max(60).optional(), targetId: idLike.optional(), reason: z.string().max(2000).optional() }).passthrough(),
  "report-bug": z.object({ description: z.string().max(4000).optional(), url: z.string().max(2048).optional() }).passthrough(),
  "block": z.object({ targetId: idLike.optional() }).passthrough(),
  "unblock": z.object({ targetId: idLike.optional() }).passthrough(),
  "block-user": z.object({ targetId: idLike.optional() }).passthrough(),
  "unblock-user": z.object({ targetId: idLike.optional() }).passthrough(),
  "apply-promo": z.object({ code: z.string().max(64).optional() }).passthrough(),
  "unmatch": z.object({ matchId: idLike.optional() }).passthrough(),
  "rsvp": z.object({ eventId: idLike.optional() }).passthrough(),
  "book-session": z.object({ sessionId: idLike.optional() }).passthrough(),
  "brief-apply": z.object({ briefId: idLike.optional() }).passthrough(),
  "saved-search-save": z.object({ name: z.string().max(120).optional() }).passthrough(),
  "save-preferences": z.object({ preferences: z.record(z.string(), z.unknown()).optional() }).passthrough(),
  "submit-idea": z.object({ title: z.string().max(200).optional(), body: z.string().max(5000).optional() }).passthrough(),
};

export type RestValidation = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

/** Guard + validate the per-action `rest` bag before it reaches a handler. */
export function validateRest(actionType: string, rest: Record<string, unknown>): RestValidation {
  for (const k of Object.keys(rest)) {
    if (POLLUTED_KEYS.has(k)) return { ok: false, error: "Invalid request field" };
  }
  let str: string;
  try { str = JSON.stringify(rest); } catch { return { ok: false, error: "Invalid request body" }; }
  if (str.length > MAX_REST_BYTES) return { ok: false, error: "Payload too large" };

  const schema = MUSE_REST_SCHEMAS[actionType];
  if (!schema) return { ok: true, data: rest };
  const parsed = schema.safeParse(rest);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Invalid request" };
  return { ok: true, data: parsed.data as Record<string, unknown> };
}
