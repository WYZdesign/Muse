import { initialsAvatarUrl } from "./initials-avatar";

/**
 * Applies the app-wide broken/missing-photo fallback to an <img> element.
 *
 * The three call sites that used to own this logic inline (the global
 * capture-phase `error` listener, the MutationObserver sweep for images
 * mounted with an empty/missing src, and DiscoverScreen's own onError prop)
 * each tried to paint a visible initial/emoji by setting `img.style.*` for
 * flex centering plus `img.textContent` (or `img.alt`) as the "content".
 * That never rendered anything: `<img>` is a replaced element per the HTML
 * spec, so child text content — however it's assigned — is not displayed
 * inside it, regardless of display/alignItems/color styling. The visible
 * result in every one of those paths was a solid gradient box with no
 * initial, no emoji, nothing — exactly the "broken" look the fallback was
 * trying to avoid.
 *
 * Fix: swap the `<img>`'s `src` for a real, rendered SVG data: URI — the
 * same deterministic, network-free `initialsAvatarUrl` already used when a
 * profile first bootstraps without a photo (see useBootstrapData.ts). This
 * is still "just an <img> showing an image", so it needs no DOM
 * restructuring and no new CSS, and it renders correctly in every browser
 * with zero extra network requests (no risk of the fallback itself failing
 * to load).
 *
 * Idempotent via `img.dataset.fallback` — safe to call from multiple
 * listeners/observers without double-processing the same element.
 */
export function applyImgFallback(img: HTMLImageElement): void {
  if (img.dataset.fallback) return;
  img.dataset.fallback = "1";
  const name = (img.alt || "").trim() || "Creative";
  // Fold in whatever src/srcset it had (even broken) so two different
  // broken photos for two different people don't coincidentally collapse
  // onto the same generated color — initialsAvatarUrl hashes this seed.
  const seed = img.getAttribute("src") || img.getAttribute("srcset") || name;
  img.alt = name;
  img.src = initialsAvatarUrl(name, seed);
  // next/image-rendered <img> elements often carry a srcset pointing at
  // the same broken source in multiple sizes; leaving it in place would
  // let the browser prefer it over the src we just set.
  img.removeAttribute("srcset");
}
