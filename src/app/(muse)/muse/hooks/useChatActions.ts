"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { Match, Screen } from "../components/types";
import { persistMessage } from "@/app/muse-realtime";
import { sanitizeInput } from "../page-helpers";
import { analytics } from "../lib/analytics";
import { DEMO_MODE } from "../page-constants";
import type { MuseToastInput } from "./useMuseActions";

/**
 * Chat action handlers, extracted verbatim from page.tsx: opening a thread
 * (`openChat`), sending a text message (`sendMsg`, including the payment+NSFW
 * disclosure intercept and the demo auto-reply), an image message
 * (`sendChatImg`) and a voice/video note (`sendChatMedia`). Pure relocation:
 * chat state, the optimistic-bubble setters, the end-of-thread ref and the
 * quest/toast helpers all arrive through one options object. All useCallback
 * dependency arrays are unchanged.
 */
export type UseChatActionsArgs = {
  chatInput: string;
  chatTarget: Match | null;
  authUser: { id: string; profile?: { id: string } } | null;
  setChatInput: Dispatch<SetStateAction<string>>;
  setChatTarget: Dispatch<SetStateAction<Match | null>>;
  setMatches: Dispatch<SetStateAction<Match[]>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
  setShowDisclosureModal: Dispatch<SetStateAction<boolean>>;
  setDisclosureTarget: Dispatch<SetStateAction<{ id: string; name: string } | null>>;
  setTypingTarget: Dispatch<SetStateAction<number | null>>;
  messagesEndRef: { current: HTMLDivElement | null };
  trackQuest: (...actionKeys: string[]) => void | Promise<void>;
  showToast: (msg: MuseToastInput) => void;
};

export function useChatActions({
  chatInput,
  chatTarget,
  authUser,
  setChatInput,
  setChatTarget,
  setMatches,
  setScreen,
  setShowDisclosureModal,
  setDisclosureTarget,
  setTypingTarget,
  messagesEndRef,
  trackQuest,
  showToast,
}: UseChatActionsArgs) {
  const openChat = useCallback((match: Match) => { setChatTarget(match); setScreen("chat"); }, [setChatTarget]);

  const sendMsg = useCallback(async (overrideText?: string) => {
    const inputText = overrideText !== undefined ? overrideText : chatInput;
    if (!inputText.trim() || !chatTarget) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const clean = sanitizeInput(inputText.trim());
    if (!clean) return;

    // ═══ DISCLOSURE TRIGGER ═══
    // Intercept messages containing payment + NSFW keywords → show disclosure form
    const lower = clean.toLowerCase();
    const hasPayment = /\$[\d]+|\bpay\b|\bcompensation\b|\brate\b|\bbudget\b|\bfee\b|\bcharged?\b/i.test(lower);
    const hasNsfw = /\bnude\b|\bnudity\b|\bnsfw\b|\bnsf[ww]\b|\bexplicit\b|\bboudoir\b|\bpenetrat\b|\bsexual\b|\berotic\b|\btopless\b|\bundressed\b|\bintimate\b|\bsensual\b|\badult\b/i.test(lower);
    if (hasPayment && hasNsfw) {
      setDisclosureTarget({ id: String(chatTarget.id), name: chatTarget.name || "Unknown" });
      setShowDisclosureModal(true);
      return; // Don't send the raw message — disclosure replaces it
    }

    const myId = authUser?.profile?.id || authUser?.id || "local";
    // Generated once and threaded through to both the optimistic bubble and
    // the server insert so history-merge can dedup by id instead of content —
    // two distinct messages with identical text sent close together used to
    // get collapsed into one.
    const clientMsgId = `${myId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userMsg = { from: "me", text: clean, time: now, clientMsgId };
    const targetId = String(chatTarget.id);
    setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev);
    setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, userMsg] } : m));
    setChatInput("");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    let sent = true;
    let pendingRequest = false;
    try { const r = await persistMessage({ myId, theirId: targetId, text: clean, clientMsgId }); sent = r.ok; pendingRequest = !!r.pending; } catch { sent = false; }
    // persistMessage returns false (never throws) on a real failure — safety
    // block, rate limit, or a block between the two of you. The bubble was
    // already shown optimistically above; without this the sender would see
    // "sent" even when the message never reached the other person at all.
    if (!sent && myId !== "local") {
      setChatTarget(prev => prev ? { ...prev, messages: prev.messages.filter(m => m !== userMsg) } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: m.messages.filter(mm => mm !== userMsg) } : m));
      showToast({ msg: "Message couldn't be sent", type: "error" });
      return;
    }
    analytics.messageSend(String(chatTarget?.id || ""), false);
    trackQuest("send_message", "first_message");
    if (pendingRequest) {
      showToast({ msg: "Sent as a message request — they'll see it in Requests." });
      const mark = (list: any[]) => list.map(m => m === userMsg ? { ...m, pending: true } : m);
      setChatTarget(prev => prev ? { ...prev, messages: mark(prev.messages) } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: mark(m.messages) } : m));
    }
    // Show typing + simulated reply only in demo mode (no real remote partner).
    if (!DEMO_MODE) return;
    setTypingTarget(Number(chatTarget.id));
    setTimeout(() => {
      setTypingTarget(null);
      const replies = ["Great vision, let's work on this","I'm available — tell me more about the project","This is exactly what I'm looking for","Let's make something great together","This aligns with what I do best","I'd be glad to bring this to life","Can we schedule a call to discuss?","I've been looking for something like this","Ready when you are — let's create","This is the right fit for my portfolio"];
      const reply = { from: "them" as const, text: replies[~~(Math.random() * replies.length)], time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, reply] } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, reply] } : m));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    }, 1200 + Math.random() * 2000);
  }, [chatInput, chatTarget, authUser, trackQuest, setChatInput, setChatTarget, setMatches, setShowDisclosureModal, setTypingTarget, showToast]);

  // Send an image message (chat attach button → uploaded URL → image bubble).
  const sendChatImg = useCallback(async (imgUrl: string) => {
    if (!imgUrl || !chatTarget) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const myId = authUser?.profile?.id || authUser?.id || "local";
    const clientMsgId = `${myId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userMsg = { from: "me" as const, text: "", img: imgUrl, time: now, clientMsgId };
    const targetId = String(chatTarget.id);
    setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev);
    setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, userMsg] } : m));
    setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    let sent = true;
    try { sent = (await persistMessage({ myId, theirId: targetId, text: "", img: imgUrl, clientMsgId })).ok; } catch { sent = false; }
    if (!sent && myId !== "local") {
      setChatTarget(prev => prev ? { ...prev, messages: prev.messages.filter(m => m !== userMsg) } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: m.messages.filter(mm => mm !== userMsg) } : m));
      showToast("Image couldn't be sent");
      return;
    }
    analytics.messageSend(String(chatTarget?.id || ""), true);
    if (!DEMO_MODE) return;
    setTypingTarget(Number(chatTarget.id));
    setTimeout(() => {
      setTypingTarget(null);
      const replies = ["Love this shot! 🔥","This is gorgeous","Wow, where was this taken?","You've got a great eye","This is exactly my style","Incredible work","Okay, this is art","I need to know the story behind this"];
      const reply = { from: "them" as const, text: replies[~~(Math.random() * replies.length)], time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, reply] } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, reply] } : m));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    }, 1200 + Math.random() * 2000);
  }, [chatTarget, authUser, setChatTarget, setMatches, setTypingTarget, showToast]);

  const sendChatMedia = useCallback(async (url: string, kind: "voice" | "video", durationMs: number, mediaType: string, transcript?: string) => {
    if (!url || !chatTarget) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const myId = authUser?.profile?.id || authUser?.id || "local";
    const clientMsgId = `${myId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userMsg = { from: "me" as const, text: "", img: "", kind, mediaUrl: url, mediaType, durationMs, transcript, time: now, clientMsgId };
    const targetId = String(chatTarget.id);
    setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev);
    setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, userMsg] } : m));
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    let sent = true;
    try {
      sent = (await persistMessage({ myId, theirId: targetId, text: "", img: "", kind, mediaUrl: url, mediaType, durationMs, transcript, clientMsgId })).ok;
    } catch { sent = false; }
    if (!sent && myId !== "local") {
      setChatTarget(prev => prev ? { ...prev, messages: prev.messages.filter(m => m !== userMsg) } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: m.messages.filter(mm => mm !== userMsg) } : m));
      showToast(kind === "voice" ? "Voice note couldn't be sent" : "Video note couldn't be sent");
    }
  }, [chatTarget, authUser, setChatTarget, setMatches, showToast]);

  return { openChat, sendMsg, sendChatImg, sendChatMedia };
}
