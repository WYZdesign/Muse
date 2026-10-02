"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Per-screen UI state persistence.
 *
 * Tracks scroll position, active tabs, and other UI state per screen.
 * State is persisted to localStorage (muse_v1.uiState) so it survives
 * navigation and page reloads. Screens mount on first visit (lazy-mount)
 * and their state is restored when they re-mount.
 *
 * Usage:
 *   const { saveScroll, restoreScroll, saveTab, restoreTab, saveState, restoreState } = useScreenUIState(screen);
 *
 * In screen component:
 *   <div ref={el => { if (el) restoreScroll(el); }} onScroll={e => saveScroll(e.currentTarget.scrollTop)}>
 *   <Tabs value={restoreTab("filterTab")} onChange={v => saveTab("filterTab", v)} />
 */
export interface ScreenUIState {
  scrollTop?: number;
  tabs?: Record<string, string>;
  custom?: Record<string, unknown>;
}

interface UseScreenUIStateReturn {
  saveScroll: (top: number) => void;
  restoreScroll: (el: HTMLElement | null) => void;
  saveTab: (key: string, value: string) => void;
  restoreTab: (key: string, defaultValue?: string) => string;
  saveState: (key: string, value: unknown) => void;
  restoreState: <T>(key: string, defaultValue?: T) => T | undefined;
  getState: () => ScreenUIState;
  clear: () => void;
}

const STORAGE_KEY = "muse_v1";
const UI_STATE_KEY = "uiState";

function loadGlobalUIState(): Record<string, ScreenUIState> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.[UI_STATE_KEY] && typeof parsed[UI_STATE_KEY] === "object") {
        return parsed[UI_STATE_KEY];
      }
    }
  } catch { /* storage unavailable or corrupt — fall back to empty */ }
  return {};
}

function saveGlobalUIState(state: Record<string, ScreenUIState>) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let parsed: Record<string, unknown> = {};
    if (stored) parsed = JSON.parse(stored);
    parsed[UI_STATE_KEY] = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch { /* storage unavailable — skip persist */ }
}

export function useScreenUIState(screen: string): UseScreenUIStateReturn {
  const [state, setState] = useState<ScreenUIState>({});
  const initialized = useRef(false);
  const isClient = useRef(typeof window !== "undefined");

  // Load on mount (handles lazy-mount where screen wasn't in initial state)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const global = loadGlobalUIState();
      if (global[screen]) {
        setState(global[screen]);
      }
    }
  }, [screen]);

  // Persist changes (client-only)
  useEffect(() => {
    if (initialized.current && isClient.current) {
      const global = loadGlobalUIState();
      saveGlobalUIState({ ...global, [screen]: state });
    }
  }, [screen, state]);

  const saveScroll = (top: number) => {
    setState(prev => ({ ...prev, scrollTop: top }));
  };

  const restoreScroll = (el: HTMLElement | null) => {
    if (el && typeof state.scrollTop === "number") {
      el.scrollTop = state.scrollTop;
    }
  };

  const saveTab = (key: string, value: string) => {
    setState(prev => ({
      ...prev,
      tabs: { ...prev.tabs, [key]: value },
    }));
  };

  const restoreTab = (key: string, defaultValue?: string): string => {
    return state.tabs?.[key] ?? defaultValue ?? "";
  };

  const saveState = (key: string, value: unknown) => {
    setState(prev => ({
      ...prev,
      custom: { ...prev.custom, [key]: value },
    }));
  };

  const restoreState = <T>(key: string, defaultValue?: T): T | undefined => {
    return (state.custom?.[key] as T) ?? defaultValue;
  };

  const getState = () => state;

  const clear = () => {
    setState({});
    const global = loadGlobalUIState();
    delete global[screen];
    saveGlobalUIState(global);
  };

  return { saveScroll, restoreScroll, saveTab, restoreTab, saveState, restoreState, getState, clear };
}