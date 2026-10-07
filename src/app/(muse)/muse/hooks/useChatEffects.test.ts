// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/muse-realtime", () => ({
  subscribeToConversation: vi.fn(() => ({ sendTyping: vi.fn(), unsubscribe: vi.fn() })),
  fetchConversationHistory: vi.fn(async () => []),
}));

import { renderHook, cleanup } from "@testing-library/react";
import { useChatEffects } from "./useChatEffects";
import { subscribeToConversation, fetchConversationHistory } from "@/app/muse-realtime";
import type { Match } from "../components/types";

beforeEach(() => {
  vi.mocked(subscribeToConversation).mockClear();
  vi.mocked(fetchConversationHistory).mockClear();
});
afterEach(() => cleanup());

const MATCH = { id: 1, name: "Ada", messages: [] } as unknown as Match;
const AUTH = { profile: { id: "me" } };

function args(over: Record<string, unknown> = {}) {
  return {
    authUser: AUTH,
    chatTarget: MATCH,
    setChatTarget: vi.fn(),
    setMatches: vi.fn(),
    setThemTyping: vi.fn(),
    typingTimerRef: { current: null },
    sendTypingRef: { current: () => {} },
    messagesEndRef: { current: null },
    ...over,
  };
}

describe("useChatEffects", () => {
  it("starts in connecting status", () => {
    const { result } = renderHook(() => useChatEffects(args() as never));
    expect(result.current.realtimeStatus).toBe("connecting");
  });

  it("subscribes to the conversation and hydrates history when a chat is open", () => {
    renderHook(() => useChatEffects(args() as never));
    expect(subscribeToConversation).toHaveBeenCalledTimes(1);
    expect(fetchConversationHistory).toHaveBeenCalledTimes(1);
  });

  it("does not subscribe without an open chat", () => {
    vi.mocked(subscribeToConversation).mockClear();
    renderHook(() => useChatEffects(args({ chatTarget: null }) as never));
    expect(subscribeToConversation).not.toHaveBeenCalled();
  });

  // Regression: a live-received voice/video note previously rendered as a
  // blank bubble because onMessage only forwarded (senderId, text, img) and
  // dropped kind/mediaUrl/mediaType/durationMs/transcript — those only
  // showed up correctly after a reload re-ran fetchConversationHistory,
  // which already mapped them. subscribeToConversation now passes a 4th
  // "extras" arg; this locks in that useChatEffects merges it into the
  // message it appends.
  it("merges voice/video-note extras from a live message into the appended message", () => {
    const setChatTarget = vi.fn();
    const setMatches = vi.fn();
    renderHook(() => useChatEffects(args({ setChatTarget, setMatches }) as never));
    const onMessage = vi.mocked(subscribeToConversation).mock.calls[0][0].onMessage as (
      senderId: string, text: string, img?: string, extras?: Record<string, unknown>
    ) => void;
    onMessage("them-id", "", undefined, { kind: "voice", mediaUrl: "https://x/clip.webm", mediaType: "audio/webm", durationMs: 4200, transcript: "hey" });

    const updater = setChatTarget.mock.calls[0][0] as (prev: Match) => Match;
    const next = updater(MATCH);
    const appended = next.messages[next.messages.length - 1] as unknown as Record<string, unknown>;
    expect(appended.kind).toBe("voice");
    expect(appended.mediaUrl).toBe("https://x/clip.webm");
    expect(appended.durationMs).toBe(4200);
    expect(appended.transcript).toBe("hey");
  });
});
