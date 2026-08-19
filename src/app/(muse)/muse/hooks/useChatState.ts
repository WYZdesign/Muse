"use client";
import { useState } from "react";
import type { Match } from "../components/types";

/**
 * Chat-scoped UI state, extracted from page.tsx. Owns the active conversation
 * target, draft input, image attachments, typing indicators, and the
 * unmatch/match-menu targets.
 */
export function useChatState() {
  const [chatTarget, setChatTarget] = useState<Match | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [showMatchMenu, setShowMatchMenu] = useState(false);
  const [unmatchTarget, setUnmatchTarget] = useState<string | null>(null);
  const [chatImages, setChatImages] = useState<Record<number, string[]>>({});
  const [typingTarget, setTypingTarget] = useState<number | null>(null);
  const [themTyping, setThemTyping] = useState(false);

  return {
    chatTarget, setChatTarget,
    chatInput, setChatInput,
    showMatchMenu, setShowMatchMenu,
    unmatchTarget, setUnmatchTarget,
    chatImages, setChatImages,
    typingTarget, setTypingTarget,
    themTyping, setThemTyping,
  };
}
