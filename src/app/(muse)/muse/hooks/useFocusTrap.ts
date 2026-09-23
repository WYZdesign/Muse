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

    // Inert background app content to prevent Tab escape
    const phone = document.getElementById("muse-app");
    const inerted: HTMLElement[] = [];
    if (phone) {
      const parent = phone.parentElement;
      if (parent) {
        Array.from(parent.children).forEach((sib) => {
          if (sib !== phone && sib instanceof HTMLElement && !sib.hasAttribute("inert")) {
            sib.setAttribute("inert", "");
            sib.setAttribute("aria-hidden", "true");
            inerted.push(sib);
          }
        });
      }
      // Also inert the phone itself while modal is open
      if (!phone.hasAttribute("inert")) {
        phone.setAttribute("inert", "");
        phone.setAttribute("aria-hidden", "true");
        inerted.push(phone);
      }
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
