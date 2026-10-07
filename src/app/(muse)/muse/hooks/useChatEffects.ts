"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { subscribeToConversation, fetchConversationHistory } from "@/app/muse-realtime";
import type { Match } from "../components/types";

/**
 * Realtime subscription + persisted-history hydration for the active chat,
 * extracted verbatim from page.tsx's two adjacent effects. Same guards, same
 * onMessage/onStatus/onTyping bodies, same cleanup returns and same dependency
 * arrays. Ref props are typed structurally so the hook does not depend on the
 * React version's useRef overloads.
 */
export type UseChatEffectsArgs = {
  authUser: { id: string; profile?: { id: string } } | null;
  chatTarget: Match | null;
  setChatTarget: Dispatch<SetStateAction<Match | null>>;
  setMatches: Dispatch<SetStateAction<Match[]>>;
  setThemTyping: Dispatch<SetStateAction<boolean>>;
  typingTimerRef: { current: ReturnType<typeof setTimeout> | null };
  sendTypingRef: { current: () => void };
  messagesEndRef: { current: HTMLDivElement | null };
};

export function useChatEffects({
  authUser,
  chatTarget,
  setChatTarget,
  setMatches,
  setThemTyping,
  typingTimerRef,
  sendTypingRef,
  messagesEndRef,
}: UseChatEffectsArgs) {
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  // Real-time incoming messages for the active conversation.
  useEffect(() => {
    if (!chatTarget || !authUser?.profile?.id) return;
    const myId = authUser.profile.id;
    const theirId = String(chatTarget.id);
    const sub = subscribeToConversation({
      myId,
      theirId,
      onMessage: (senderId, text, img, extras) => {
        // extras carries kind/mediaUrl/mediaType/durationMs/transcript through
        // from the live INSERT row — without this a voice/video note received
        // while the chat is open rendered as a blank bubble with no player
        // (it only looked right after a reload re-ran the history fetch,
        // which already mapped these fields).
        const msg = { from: "them" as const, text, img, ...extras, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
        setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev);
        setMatches(prev => prev.map(m => String(m.id) === theirId ? { ...m, messages: [...m.messages, msg] } : m));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
      },
      onStatus: (status) => setRealtimeStatus(status),
      onTyping: () => {
        setThemTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setThemTyping(false), 2200);
      },
    });
    sendTypingRef.current = sub.sendTyping;
    return sub.unsubscribe;
  }, [authUser?.profile?.id, chatTarget, chatTarget?.id, authUser?.id, setChatTarget, setMatches, setThemTyping]);

  // Load persisted conversation history when a chat is opened -- the realtime
  // subscription above only catches messages that arrive *after* it connects,
  // so without this a returning user (new device, cleared storage, or just a
  // missed message) would only ever see whatever happens to be in local state.
  // Server history is treated as canonical; any local-only messages (e.g. an
  // optimistic send not yet reflected server-side) are appended after it.
  useEffect(() => {
    if (!chatTarget || !authUser?.profile?.id) return;
    const myId = authUser.profile.id;
    const theirId = String(chatTarget.id);
    let cancelled = false;
    fetchConversationHistory({ myId, theirId }).then(history => {
      if (cancelled || !history.length) return;
      // Prefer id-based dedup (clientMsgId, threaded through from send time)
      // over content matching — two distinct messages sent close together
      // with identical text+img used to collapse into one under the old
      // text+"|"+img key. Fall back to content matching only for messages
      // that predate this fix and never got a clientMsgId.
      const seenIds = new Set(history.map(h => h.clientMsgId).filter(Boolean));
      const seenContent = new Set(history.map(h => h.text + "|" + (h.img || "")));
      const isDupe = (m: { clientMsgId?: string; text?: string; img?: string }) => m.clientMsgId ? seenIds.has(m.clientMsgId) : seenContent.has((m.text || "") + "|" + (m.img || ""));
      setChatTarget(prev => {
        if (!prev || String(prev.id) !== theirId) return prev;
        const localOnly = (prev.messages || []).filter(m => !isDupe(m));
        return { ...prev, messages: [...history, ...localOnly] };
      });
      setMatches(prev => prev.map(m => {
        if (String(m.id) !== theirId) return m;
        const localOnly = (m.messages || []).filter(mm => !isDupe(mm));
        return { ...m, messages: [...history, ...localOnly] };
      }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [authUser?.profile?.id, chatTarget, chatTarget?.id, authUser?.id, setChatTarget, setMatches]);

  return { realtimeStatus };
}
