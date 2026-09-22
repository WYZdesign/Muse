"use client";
import { useState, useRef } from "react";

export function useUIState() {
  const [toastMsg, setToastMsg] = useState<{ msg: string; onTap?: () => void; type?: "info" | "success" | "error" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showStory, setShowStory] = useState<number | null>(null);
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 100000));
  const [matchSwiping, setMatchSwiping] = useState<{ id: string; offset: number } | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [dragValues, setDragValues] = useState({ x: 0, y: 0, opacity: 0 });

  const matchSwipeRef = useRef<{ id: string; startX: number; el: HTMLElement | null }>({ id: "", startX: 0, el: null });
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingRef = useRef<() => void>(() => {});
  const dragRef = useRef<{ startX: number; startY: number; active: boolean; relY: number; startTime: number; el: HTMLElement | null; axis: "x" | "y" | null }>({ startX: 0, startY: 0, active: false, relY: 0, startTime: 0, el: null, axis: null });
  const likeLabelRef = useRef<HTMLDivElement>(null);
  const nopeLabelRef = useRef<HTMLDivElement>(null);
  const superLabelRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const sessTypeRef = useRef<string>("");

  return {
    toastMsg, setToastMsg,
    searchQuery, setSearchQuery,
    searchOpen, setSearchOpen,
    showStory, setShowStory,
    shuffleSeed,
    matchSwipeRef,
    matchSwiping, setMatchSwiping,
    realtimeStatus, setRealtimeStatus,
    typingTimerRef,
    sendTypingRef,
    dragRef,
    likeLabelRef,
    nopeLabelRef,
    superLabelRef,
    rafRef,
    dragValues, setDragValues,
    sessTypeRef,
  };
}