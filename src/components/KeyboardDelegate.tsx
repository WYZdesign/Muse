"use client";

import { useEffect } from "react";

/**
 * Global keyboard delegate for role="button" elements that lack their own
 * onKeyDown handler.  This covers informational badge spans and similar
 * lightweight interactive elements spread across many screens.  Elements
 * that already define onKeyDown are left untouched.
 */
export default function KeyboardDelegate() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter" && e.key !== " ") return;
      const target = e.target as HTMLElement;
      if (target.getAttribute("role") !== "button") return;
      if (target.getAttribute("tabIndex") === null) return;
      if (typeof target.getAttribute("onkeydown") === "string" && target.getAttribute("onkeydown") !== "") return;
      if ((target as any).onkeydown) return;
      e.preventDefault();
      e.stopPropagation();
      target.click();
    }
    document.addEventListener("keydown", handleKeyDown, { capture: true, passive: false });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true } as any);
  }, []);
  return null;
}
