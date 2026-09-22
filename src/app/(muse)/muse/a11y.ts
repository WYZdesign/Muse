/**
 * Announce a message to screen readers via the live region.
 * Call announce("Portfolio photo 2 of 3") after carousel navigation,
 * announce("Post saved") after a successful action, etc.
 */
export function announce(msg: string, assertive = false) {
  if (typeof document === "undefined") return;
  const el = document.getElementById("muse-live-status");
  if (!el) return;
  el.setAttribute("aria-live", assertive ? "assertive" : "polite");
  // Clear then set so repeated identical messages still announce
  el.textContent = "";
  requestAnimationFrame(() => { el.textContent = msg; });
}
