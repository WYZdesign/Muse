"use client";

import { useEffect } from "react";
import { QUOTA_MSG } from "../lib/safe-storage";

/**
 * Window-level toast channels, extracted verbatim from page.tsx's two adjacent
 * effects: the storage-quota event surfacing and the `muse:toast` channel used
 * by code that runs before showToast exists (session bootstrap). Same
 * registration order, same listeners and cleanup, same [showToast] deps.
 */
export type UseToastChannelArgs = {
  showToast: (msg: string) => void;
};

export function useToastChannel({ showToast }: UseToastChannelArgs) {
  // Surface storage quota failures to the user instead of failing silently.
  useEffect(() => {
    const onQuota = () => showToast(QUOTA_MSG);
    window.addEventListener("muse:storage-quota", onQuota);
    return () => window.removeEventListener("muse:storage-quota", onQuota);
  }, [showToast]);

  // Toast channel for code that runs before showToast exists (session bootstrap).
  useEffect(() => {
    const onToast = (e: Event) => { const msg = (e as CustomEvent<string>).detail; if (msg) showToast(msg); };
    window.addEventListener("muse:toast", onToast);
    return () => window.removeEventListener("muse:toast", onToast);
  }, [showToast]);
}
