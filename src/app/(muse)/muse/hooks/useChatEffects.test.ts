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
});
