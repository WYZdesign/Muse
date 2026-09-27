"use client";

import { useEffect, useRef } from "react";
import { createSafeObserver } from "../lib/safe-observer";

/**
 * Ambient visual/DOM effects, extracted verbatim from page.tsx: the global
 * broken-image fallback sweep (capture-phase error listener + MutationObserver),
 * the background-transparency restore, the tide-wave scroll listener, the
 * scroll-to-top-on-navigation reset, and the Discover card `waves-visible`
 * observer. Every body, guard, early-return, cleanup and dependency array is
 * unchanged. The global image sweep is the earliest effect in the file and now
 * runs at the position of the transparency effect (its first sibling) rather
 * than at the very top; it only installs listeners/observers, so the shift is
 * behaviour-neutral.
 */
export type UseVisualEffectsArgs = {
  screen: string;
};

export function useVisualEffects({ screen }: UseVisualEffectsArgs) {
  useEffect(() => {
    const onImgError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      if (img.tagName !== "IMG" || img.dataset.fallback) return;
      img.dataset.fallback = "1";
      img.style.background = "linear-gradient(135deg, #FF6B9D 0%, #C86BFF 50%, #FFB366 100%)";
      img.style.display = "flex";
      img.style.alignItems = "center";
      img.style.justifyContent = "center";
      img.style.color = "#fff";
      img.style.fontSize = "2em";
      img.alt = img.alt?.charAt(0) || "👤";
      img.removeAttribute("src");
    };
    document.addEventListener("error", onImgError, true);
    // MutationObserver catches <img> mounted with an empty/missing or broken src
    // (blank or "undefined") which never fires an error event. Reuse the same
    // fallback treatment when we detect one app-wide.
    const sweepImg = (img: HTMLImageElement) => {
      if (img.dataset.fallback) return;
      const src = (img.getAttribute("src") || "").trim().toLowerCase();
      const broken = !src || src === "undefined" || src === "null" || src === "none";
      if (broken) {
        img.dataset.fallback = "1";
        img.style.background = "linear-gradient(135deg, #FF6B9D 0%, #C86BFF 50%, #FFB366 100%)";
        img.style.display = "flex";
        img.style.alignItems = "center";
        img.style.justifyContent = "center";
        img.style.color = "#fff";
        img.style.fontSize = "1.6em";
        img.style.fontWeight = "700";
        img.style.fontFamily = "'Playfair Display', serif";
        img.alt = img.alt?.trim().charAt(0) || "👤";
        img.textContent = img.alt || "👤";
        img.removeAttribute("src");
      }
    };
    // Wrapped in createSafeObserver (rate-based circuit breaker) as
    // defense-in-depth: this callback is already guarded against
    // self-retriggering (img.dataset.fallback check-before-mutate), but it
    // still does a subtree querySelectorAll("img") on every childList
    // mutation anywhere in the app. A future edit that removes the guard,
    // or an unrelated part of the app generating very high-frequency DOM
    // churn, would otherwise be able to reproduce the same class of
    // main-thread-freezing storm found in the "waves" observer below —
    // this makes that fail safe (observer disconnects) instead of freezing
    // the tab. See lib/safe-observer.ts for why this can't be caught once
    // it happens, only prevented.
    const mo = createSafeObserver((muts) => {
      for (const m of muts) {
        if (m.type === "childList") m.addedNodes.forEach(n => { if (n.nodeType === 1 && (n as Element).querySelectorAll) (n as Element).querySelectorAll("img").forEach(img => sweepImg(img as HTMLImageElement)); });
        if (m.type === "attributes" && m.target.nodeName === "IMG") sweepImg(m.target as HTMLImageElement);
      }
    }, { label: "img-fallback-sweep" });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    document.querySelectorAll<HTMLImageElement>("img").forEach(sweepImg);
    return () => { document.removeEventListener("error", onImgError, true); mo.disconnect(); };
  }, []);

  // Load background transparency from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("muse_bg_opacity");
      if (stored) document.documentElement.style.setProperty("--scene-opacity", stored);
    } catch { console.debug("[muse] screen scroll restoration failed"); }
  }, []);

  // Show the tide waves only when the user scrolls to the very bottom of the
  // active screen — attach a scroll listener to whichever .screen-el is active,
  // re-binding on screen change. The waves fade in (CSS .show) ~40px from the
  // bottom; the active screen is found via the live DOM so this keeps working
  // for every screen without a per-screen listener.
  // Show waves at bottom of ANY screen when scrolled near the bottom.
  const waveShowRef = useRef(false);
  useEffect(() => {
    const wave = document.querySelector(".wave-bottom");
    const check = () => {
      const p = document.querySelector('.screen-el.active');
      if (!p || !wave) return;
      const scroller = (p as HTMLElement).scrollTop !== undefined ? (p as HTMLElement) : p.querySelector<HTMLElement>('[style*="overflow"],.conn-scroll,.profile-scroll,.settings-scroll,.portfolio-scroll,.match-list');
      const el: HTMLElement | null = scroller || p as HTMLElement;
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      if (near !== waveShowRef.current) {
        waveShowRef.current = near;
        wave.classList.toggle("show", near);
      }
    };
    const scroller = document.querySelector(".screen-el.active");
    if (scroller) {
      scroller.addEventListener("scroll", check, { passive: true });
      check();
    }
    return () => { if (scroller) scroller.removeEventListener("scroll", check); };
  }, [screen]);

  // Scroll to top on every screen navigation (Torreé audit), except Settings
  // and Profile — those manage their own internal scroll position and a
  // reset here would fight it. Keyed on `screen` so it fires whether
  // navigation went through showScreen, goBack, or a direct setScreen call.
  // Most screens' real scrolling happens on an inner content div (flex:1,
  // overflowY:auto) rather than the outer .screen-el itself, so this resets
  // both the .screen-el.active container and any scrollable descendant.
  useEffect(() => {
    if (screen === "settings" || screen === "profile") return;
    try {
      const active = document.querySelector<HTMLElement>(".screen-el.active");
      if (!active) return;
      active.scrollTop = 0;
      active.querySelectorAll<HTMLElement>('[style*="overflow"],.match-list,.messages,.profile-scroll,.portfolio-scroll,.settings-scroll,.briefs-scroll,.conn-scroll,.sub-scroll,.modal-body,.card-info-scroll').forEach(el => { el.scrollTop = 0; });
    } catch { console.debug("[muse] streak refresh failed"); }
  }, [screen]);

  // Also always show waves on the swipe card (Discover) as a gradient accent.
  //
  // CRITICAL FIX (freeze root cause): this previously observed
  // document.body with { childList: true, subtree: true, attributes: true,
  // attributeFilter: ['class'] } — i.e. every class-attribute change and
  // every node insertion/removal ANYWHERE on the page, not just Discover.
  // Its own callback called classList.add('waves-visible'), which is
  // itself a class-attribute mutation the same observer was watching, and
  // reran document.querySelectorAll('.swipe-card.top-card') (a whole-
  // document query) on every single one of those mutations. Mounting the
  // Discover card stack (or, after that, literally any class/DOM churn
  // anywhere else in this 3000+ line app — toasts, badges, animations)
  // could fire this callback in rapid, sustained succession, each firing
  // native DOM-traversal work with no JS between them to interrupt — a
  // microtask storm that starves the render thread and freezes the tab.
  // Confirmed via CPU profiling during the "app freezes after login /
  // after ~2s on Discover" reports: ~98% of samples were in Chromium's
  // native code, not JS, with this exact callback on the stack.
  //
  // Fix: scope the observer to the card stack only (not document.body),
  // and drop the attributes/class watch entirely — classList.add is
  // idempotent, so we only ever need to react to NEW cards being
  // inserted (childList), never to class changes (which we caused).
  //
  // HARDENING: also wrapped in createSafeObserver as a second, independent
  // layer of defense — even with the scoped target above, a future edit to
  // this effect (or to .card-stack's own render logic) could reintroduce a
  // tight mutate->observe->mutate loop. The circuit breaker makes that fail
  // as "waves stop appearing" instead of "the app freezes".
  useEffect(() => {
    const addWaves = () => {
      document.querySelectorAll('.swipe-card.top-card').forEach(c => c.classList.add('waves-visible'));
    };
    addWaves();
    const target = document.querySelector('.card-stack') || document.body;
    const obs = createSafeObserver(addWaves, { label: "discover-waves" });
    obs.observe(target, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [screen]);
}
