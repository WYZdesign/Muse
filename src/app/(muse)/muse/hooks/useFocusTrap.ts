"use client";

import { useEffect, useRef } from "react";

// Focus trap + Escape-to-close + focus restore + background inertness for modals/sheets.
// Pass `active` (modal open) and `onClose` (called on Escape). Returns a ref to
// attach to the modal container. On open it focuses the first focusable, traps
// Tab within the container, sets inert on background app content, and on close
// restores focus to the previously focused element.
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  onClose?: () => void,
) {
  const ref = useRef<T | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  // Keep the latest onClose in a ref instead of the effect's dependency array.
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

    // Inert only background branches that do NOT contain the trap container.
    // Never inert #muse-app (or any ancestor) when the modal lives inside it —
    // that used to break hit-testing and force dispatchEvent('click') workarounds.
    const inerted: HTMLElement[] = [];
    let branch: HTMLElement | null = el;
    while (branch && branch !== document.body) {
      const parent: HTMLElement | null = branch.parentElement;
      if (!parent) break;
      Array.from(parent.children).forEach((child) => {
        if (child !== branch && child instanceof HTMLElement && !child.hasAttribute("inert")) {
          child.setAttribute("inert", "");
          child.setAttribute("aria-hidden", "true");
          inerted.push(child);
        }
      });
      branch = parent;
    }

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
      // Remove inert from all previously inerted elements
      inerted.forEach((s) => {
        s.removeAttribute("inert");
        s.removeAttribute("aria-hidden");
      });
      prevFocus.current?.focus?.();
    };
     
  }, [active]);

  return ref;
}
