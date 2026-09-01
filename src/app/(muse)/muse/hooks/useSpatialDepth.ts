"use client";

/**
 * True depth-aware "Spatial Scenes" — a progressive upgrade layered on top
 * of useDeviceTilt.ts's createSpatialScene(). createSpatialScene tilts a
 * photo as one flat rigid plane (a real but simple 2-layer parallax trick);
 * this module instead splits a single photo into 2-4 depth *bands* — using
 * either a server-generated depth map (true depth, option 1) or an
 * in-browser subject/background segmentation mask (approximation, option
 * 2, used automatically whenever true depth isn't available) — and moves
 * each band by a different amount on tilt, the way Apple's Spatial Scenes
 * (Photos/visionOS) give a photo a real sense of layered depth instead of
 * a single tilting card.
 *
 * Fallback chain, entirely automatic and silent:
 *   1. Ask /api/muse/depth for a real depth map (needs REPLICATE_API_TOKEN +
 *      REPLICATE_DEPTH_MODEL_VERSION configured server-side — see that
 *      route's header comment). If it responds with a depth map, band it
 *      into 3 layers (far/mid/near) for the richest effect.
 *   2. Otherwise, run client-side subject/background segmentation
 *      (@tensorflow-models/body-pix) entirely in the browser — no server,
 *      no API key, no cost — and use the resulting person/background mask
 *      as a 2-layer (subject/background) depth approximation.
 *   3. If both fail (no person detected, model load fails, CORS-tainted
 *      image, reduced-motion, etc.) this module does nothing and the
 *      existing flat createSpatialScene tilt — already applied wherever
 *      this is used — remains the only effect. There is no regression
 *      path: the flat tilt is always applied first and stays live the
 *      entire time this module's upgrade is being attempted.
 *
 * Deliberately NOT wired into every card list (Network/Community/Feed/etc)
 * — running a depth API call or an in-browser ML segmentation pass on
 * every card in a scrollable list at once would be real performance cost
 * for a decorative effect. It's applied to single hero images instead
 * (Discover's top swipe card). See HANDOVER.md.
 */

import { authFetch } from "../lib/api";
import { getDeviceTilt } from "./useDeviceTilt";

const DOWNSCALE_MAX = 640; // px — plenty sharp for a card-sized image, keeps the per-pixel masking loop cheap

// imageUrl -> depth map URL, or null if we already tried and it's unavailable.
const depthUrlCache = new Map<string, string | null>();
// imageUrl -> built band layers, or null if we already tried and failed (either path).
const layerCache = new Map<string, HTMLCanvasElement[] | null>();

let segmenterPromise: Promise<any> | null = null;

async function fetchDepthMap(imageUrl: string): Promise<string | null> {
  if (depthUrlCache.has(imageUrl)) return depthUrlCache.get(imageUrl) ?? null;
  try {
    const resp = await authFetch("/api/muse/depth", { method: "POST", body: JSON.stringify({ url: imageUrl }) });
    if (!resp.ok) {
      depthUrlCache.set(imageUrl, null);
      return null;
    }
    const data = await resp.json().catch(() => null);
    const depthUrl = typeof data?.depthUrl === "string" ? data.depthUrl : null;
    depthUrlCache.set(imageUrl, depthUrl);
    return depthUrl;
  } catch {
    depthUrlCache.set(imageUrl, null);
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/** Draws `img` scaled to fit within DOWNSCALE_MAX and returns its ImageData, or null if the canvas is CORS-tainted. */
function toImageData(img: HTMLImageElement, w: number, h: number): ImageData | null {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  try {
    return ctx.getImageData(0, 0, w, h);
  } catch {
    return null; // tainted canvas (image not served with permissive CORS headers)
  }
}

/**
 * Splits `sourceImg` into `bands` canvases using `gray` (a same-size
 * grayscale/alpha field, one value per pixel via its red channel or a
 * supplied alpha channel) to decide which band each pixel belongs to.
 * Higher `gray` value = nearer band by convention (band index closer to
 * `bands - 1`). Edges between bands are feathered so the seams don't look
 * like a cardboard cutout.
 */
function bandFromField(
  sourceData: ImageData,
  field: Uint8ClampedArray,
  fieldChannelOffset: number,
  w: number,
  h: number,
  bands: number
): HTMLCanvasElement[] {
  const layers: HTMLCanvasElement[] = [];
  const bandSize = 256 / bands;
  for (let b = 0; b < bands; b++) {
    const lo = b * bandSize;
    const hi = (b + 1) * bandSize;
    const layerCanvas = document.createElement("canvas");
    layerCanvas.width = w;
    layerCanvas.height = h;
    const lctx = layerCanvas.getContext("2d")!;
    const out = lctx.createImageData(w, h);
    const feather = bandSize * 0.6;
    for (let i = 0; i < sourceData.data.length; i += 4) {
      const val = field[i + fieldChannelOffset];
      let alpha = 0;
      if (val >= lo && val < hi) {
        alpha = 255;
      } else {
        const d = val < lo ? lo - val : val - hi;
        if (d < feather) alpha = 255 * (1 - d / feather);
      }
      out.data[i] = sourceData.data[i];
      out.data[i + 1] = sourceData.data[i + 1];
      out.data[i + 2] = sourceData.data[i + 2];
      out.data[i + 3] = alpha;
    }
    lctx.putImageData(out, 0, 0);
    layers.push(layerCanvas);
  }
  return layers;
}

function targetSize(img: HTMLImageElement): { w: number; h: number } {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return { w: 0, h: 0 };
  const scale = Math.min(1, DOWNSCALE_MAX / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/** True-depth path: 3 bands (far/mid/near), nearer = brighter (standard inverse-depth convention). */
async function buildDepthLayers(sourceImg: HTMLImageElement, depthMapUrl: string): Promise<HTMLCanvasElement[] | null> {
  const { w, h } = targetSize(sourceImg);
  if (!w || !h) return null;
  let depthImg: HTMLImageElement;
  try {
    depthImg = await loadImage(depthMapUrl);
  } catch {
    return null;
  }
  const sourceData = toImageData(sourceImg, w, h);
  const depthData = toImageData(depthImg, w, h);
  if (!sourceData || !depthData) return null;
  return bandFromField(sourceData, depthData.data, 0, w, h, 3);
}

/**
 * Segmentation fallback path: 2 bands (background / subject), using
 * @tensorflow-models/body-pix — a pure-tfjs model (no external mediapipe
 * script dependency, so it bundles cleanly) run entirely client-side.
 * segmentPerson() returns a flat Uint8Array (one byte per pixel, 1 = person
 * / 0 = background, row-major, same width/height as the input) — that gets
 * expanded into a 4-byte-per-pixel field so it can share bandFromField()
 * with the depth-map path above.
 */
async function buildSegmentationLayers(sourceImg: HTMLImageElement): Promise<HTMLCanvasElement[] | null> {
  if (typeof window === "undefined") return null;
  try {
    if (!segmenterPromise) {
      segmenterPromise = (async () => {
        const [tf, , bodyPix] = await Promise.all([
          import("@tensorflow/tfjs-core"),
          import("@tensorflow/tfjs-backend-webgl"),
          import("@tensorflow-models/body-pix"),
        ]);
        await tf.setBackend("webgl");
        await tf.ready();
        return bodyPix.load({ architecture: "MobileNetV1", outputStride: 16, multiplier: 0.75, quantBytes: 2 });
      })();
    }
    const net = await segmenterPromise;
    const { w, h } = targetSize(sourceImg);
    if (!w || !h) return null;
    const sourceData = toImageData(sourceImg, w, h);
    if (!sourceData) return null;

    const seg = await net.segmentPerson(sourceData, { internalResolution: "medium", segmentationThreshold: 0.6 });
    if (!seg || !seg.data.some((v: number) => v)) return null; // no subject detected — nothing to segment against

    const maskField = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < seg.data.length; i++) maskField[i * 4 + 3] = seg.data[i] ? 255 : 0;
    // Subject (mask=1) is the near band, background (mask=0) is the far band.
    return bandFromField(sourceData, maskField, 3, w, h, 2);
  } catch (e) {
    console.error("[muse:spatial-depth] segmentation failed:", e);
    return null;
  }
}

async function buildLayersFor(imageUrl: string, sourceImg: HTMLImageElement): Promise<HTMLCanvasElement[] | null> {
  if (layerCache.has(imageUrl)) return layerCache.get(imageUrl) ?? null;

  let layers: HTMLCanvasElement[] | null = null;
  const depthMapUrl = await fetchDepthMap(imageUrl);
  if (depthMapUrl) {
    layers = await buildDepthLayers(sourceImg, depthMapUrl);
  }
  if (!layers) {
    layers = await buildSegmentationLayers(sourceImg);
  }
  layerCache.set(imageUrl, layers);
  return layers;
}

/**
 * Attaches the depth-band upgrade to every element matching `imgSelector`
 * inside every element matching `cardSelector`. Call from a useEffect
 * alongside (not instead of) createSpatialScene — this only takes over
 * once real depth/segmentation layers are ready; until then the flat tilt
 * already applied to the same image keeps running untouched.
 *
 * Returns a cleanup function.
 */
export function attachSpatialDepth(cardSelector: string, imgSelector: string): () => void {
  if (typeof window === "undefined") return () => {};
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};

  let cancelled = false;
  const cleanups: Array<() => void> = [];

  (async () => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>(cardSelector));
    for (const card of cards) {
      const img = card.querySelector(imgSelector) as HTMLImageElement | null;
      if (!img) continue;
      const src = img.currentSrc || img.src;
      if (!src) continue;

      let sourceImg: HTMLImageElement;
      try {
        sourceImg = img.complete && img.naturalWidth ? img : await loadImage(src);
      } catch {
        continue;
      }
      if (cancelled) return;

      const layers = await buildLayersFor(src, sourceImg);
      if (cancelled || !layers || !layers.length) continue;

      const container = img.parentElement as HTMLElement | null;
      if (!container) continue;
      const prevPosition = container.style.position;
      if (getComputedStyle(container).position === "static") container.style.position = "relative";

      const wrap = document.createElement("div");
      wrap.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .35s ease;";
      layers.forEach((canvas) => {
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;will-change:transform;";
        wrap.appendChild(canvas);
      });
      container.appendChild(wrap);
      img.style.transition = "opacity .35s ease";

      let raf = 0;
      const tick = () => {
        const { x, y } = getDeviceTilt();
        layers.forEach((canvas, i) => {
          // Nearer bands (higher index) shift more — the actual depth illusion.
          const depth = (i + 1) / layers.length;
          const shift = 10 * depth;
          const rotate = 4 * depth;
          canvas.style.transform = `perspective(900px) translate(${-x * shift}px, ${-y * shift}px) rotateY(${x * rotate}deg) rotateX(${-y * rotate}deg) scale(${1 + 0.02 * depth})`;
        });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      requestAnimationFrame(() => {
        wrap.style.opacity = "1";
        img.style.opacity = "0";
      });

      cleanups.push(() => {
        cancelAnimationFrame(raf);
        wrap.remove();
        img.style.opacity = "";
        img.style.transition = "";
        container.style.position = prevPosition;
      });
    }
  })();

  return () => {
    cancelled = true;
    cleanups.forEach((fn) => fn());
  };
}