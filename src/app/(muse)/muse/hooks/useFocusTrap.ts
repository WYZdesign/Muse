"use client";

import { useEffect, useRef } from "react";

// Focus trap + Escape-to-close + focus restore for modals/sheets.
// Pass `active` (modal open) and `onClose` (called on Escape). Returns a ref to
// attach to the modal container. On open it focuses the first focusable, traps
// Tab within the container, and on close restores focus to the previously
// focused element.
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  onClose?: () => void,
) {
  const ref = useRef<T | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  // Keep the latest onClose in a ref instead of the effect's dependency array.
  // Callers (e.g. MenuModal) commonly pass an inline arrow that gets a new
  // identity on every render; if `onClose` were a dependency, the setup
  // effect below would tear down and re-run on every re-render while the
  // sheet is open (a toast firing, a timer tick, any parent state change) —
  // which re-captures document.activeElement and calls first.focus() again,
  // yanking focus away from whatever the user was actually interacting with
  // (e.g. mid-typing in a field inside the sheet). Routing onClose through a
  // ref keeps the real setup effect keyed on `active` alone.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!active) return;
    prevFocus.current = document.activeElement as HTMLElement | null;

    const el = ref.current;
    if (!el) return;
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => n.offsetParent !== null);
    const first = focusables()[0];
    if (first) first.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement;
      if (e.shiftKey && activeEl === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && activeEl === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prevFocus.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return ref;
}
