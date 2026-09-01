import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";

// ═══════════════════════════════════════════════════════════════
// Muse depth-map generation — server-side proxy to a hosted
// monocular-depth-estimation model (Replicate), used to power true
// "Apple Spatial Scenes"-style layered parallax on photos, instead
// of the flat single-plane tilt in useDeviceTilt.ts's
// createSpatialScene().
//
// Configure via env (both required — unset means disabled, see
// depthEnabled() below):
//   REPLICATE_API_TOKEN          your token from replicate.com/account/api-tokens
//   REPLICATE_DEPTH_MODEL_VERSION  "owner/model" or "owner/model:version_id"
//                                   for a depth-estimation model, e.g. a
//                                   Depth-Anything-V2 variant. Deliberately
//                                   NOT hard-coded to one pinned version id
//                                   here — pick a model on replicate.com,
//                                   confirm its actual input/output schema
//                                   on its "API" tab, and set this env var
//                                   to point at it.
//   REPLICATE_DEPTH_INPUT_KEY     input field name the chosen model expects
//                                   for the source image (default "image" —
//                                   the near-universal convention, but some
//                                   models differ; check the model's schema).
//
// This route fails soft everywhere: any missing config, network error, or
// unrecognized response shape returns a JSON { error } with a non-200
// status, and the client (useSpatialDepth.ts) treats ANY non-success
// response as "no depth available" and falls back to segmentation, then
// to the existing flat tilt. Nothing here is required for the app to work
// — it's a progressive visual enhancement.
//
// Because the exact response shape of a given Replicate model isn't
// something this environment can verify against a live account/token, the
// prediction lifecycle below (POST /v1/predictions, Prefer: wait, GET
// polling, status values) follows Replicate's documented HTTP API exactly,
// but the model-specific output value is parsed defensively (string, array
// of strings, or {url} object) rather than assumed — see normalizeOutput().
// ═══════════════════════════════════════════════════════════════

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_MODEL_VERSION = process.env.REPLICATE_DEPTH_MODEL_VERSION || "";
const REPLICATE_INPUT_KEY = process.env.REPLICATE_DEPTH_INPUT_KEY || "image";

export function depthEnabled(): boolean {
  return REPLICATE_TOKEN.length > 0 && REPLICATE_MODEL_VERSION.length > 0;
}

async function isAuthed(req: NextRequest): Promise<boolean> {
  const header = req.headers.get("authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return false;
  const { data, error } = await supabase.auth.getUser(bearer);
  return !error && !!data.user;
}

function normalizeOutput(out: unknown): string | null {
  if (typeof out === "string") return out;
  if (Array.isArray(out) && typeof out[0] === "string") return out[0];
  if (out && typeof out === "object" && typeof (out as any).url === "string") return (out as any).url;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    if (!depthEnabled()) return NextResponse.json({ error: "not_configured" }, { status: 501 });
    if (!(await isAuthed(req))) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const ip = clientIp(req);
    if (!(await checkRate(ip, "depth", 20))) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const url = typeof body?.url === "string" ? body.url : "";
    // Only ever generate depth for our own uploaded photos, never an
    // arbitrary attacker-supplied URL (this endpoint is a paid API proxy).
    if (!url || !/^https:\/\//.test(url) || !url.includes("/muse-uploads/")) {
      return NextResponse.json({ error: "Invalid image url" }, { status: 400 });
    }

    const predictResp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({ version: REPLICATE_MODEL_VERSION, input: { [REPLICATE_INPUT_KEY]: url } }),
    });

    if (!predictResp.ok) {
      console.error("[muse:depth] predict failed:", predictResp.status, (await predictResp.text()).slice(0, 300));
      return NextResponse.json({ error: "Depth generation failed" }, { status: 502 });
    }

    let prediction = await predictResp.json();

    // "Prefer: wait" holds the connection up to 60s, but a cold model can
    // still come back "starting"/"processing" instead of finished — poll
    // the prediction's own status URL a few times rather than assuming
    // synchronous completion always succeeds.
    const getUrl: string | undefined = prediction?.urls?.get;
    let attempts = 0;
    while (prediction && ["starting", "processing"].includes(prediction.status) && getUrl && attempts < 10) {
      await new Promise((r) => setTimeout(r, 1500));
      const pollResp = await fetch(getUrl, { headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` } });
      if (!pollResp.ok) break;
      prediction = await pollResp.json();
      attempts++;
    }

    if (prediction?.status !== "succeeded") {
      console.error("[muse:depth] prediction did not succeed:", prediction?.status, prediction?.error);
      return NextResponse.json({ error: "Depth generation timed out or failed" }, { status: 504 });
    }

    const depthUrl = normalizeOutput(prediction.output);
    if (!depthUrl) {
      console.error("[muse:depth] unrecognized output shape:", JSON.stringify(prediction.output).slice(0, 300));
      return NextResponse.json({ error: "Unrecognized depth output" }, { status: 502 });
    }

    return NextResponse.json({ success: true, depthUrl });
  } catch (e: unknown) {
    console.error("[depth] route error:", e);
    return NextResponse.json({ error: "Depth generation failed" }, { status: 500 });
  }
}