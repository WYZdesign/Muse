// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/muse-realtime", () => ({ persistMessage: vi.fn(async () => ({ ok: true })) }));
vi.mock("../page-helpers", () => ({ sanitizeInput: (s: string) => s.trim() }));
vi.mock("../lib/analytics", () => ({ analytics: { messageSend: vi.fn() } }));
vi.mock("../page-constants", () => ({ DEMO_MODE: false }));

import { renderHook, act } from "@testing-library/react";
import { useChatActions } from "./useChatActions";
import { persistMessage } from "@/app/muse-realtime";
import type { Match } from "../components/types";

const MATCH = { id: 1, name: "Ada", messages: [] } as unknown as Match;

function setup(over: Record<string, unknown> = {}) {
  const args = {
    chatInput: "hi",
    chatTarget: MATCH,
    authUser: { profile: { id: "me" } },
    setChatInput: vi.fn(),
    setChatTarget: vi.fn(),
    setMatches: vi.fn(),
    setScreen: vi.fn(),
    setShowDisclosureModal: vi.fn(),
    setDisclosureTarget: vi.fn(),
    setTypingTarget: vi.fn(),
    messagesEndRef: { current: null },
    trackQuest: vi.fn(),
    showToast: vi.fn(),
    ...over,
  };
  return args;
}

beforeEach(() => vi.mocked(persistMessage).mockClear());

describe("useChatActions", () => {
  it("openChat sets the target and navigates to chat", () => {
    const args = setup();
    const { result } = renderHook(() => useChatActions(args as never));
    act(() => result.current.openChat(MATCH));
    expect(args.setChatTarget).toHaveBeenCalledWith(MATCH);
    expect(args.setScreen).toHaveBeenCalledWith("chat");
  });

  it("intercepts a payment + NSFW message as a disclosure (no send)", async () => {
    const args = setup({ chatInput: "I'll pay $200 for nsfw content" });
    const { result } = renderHook(() => useChatActions(args as never));
    await act(async () => { await result.current.sendMsg(); });
    expect(args.setShowDisclosureModal).toHaveBeenCalledWith(true);
    expect(persistMessage).not.toHaveBeenCalled();
  });

  it("sends a normal message optimistically and persists it", async () => {
    const args = setup();
    const { result } = renderHook(() => useChatActions(args as never));
    await act(async () => { await result.current.sendMsg(); });
    expect(args.setChatInput).toHaveBeenCalledWith("");
    expect(args.setChatTarget).toHaveBeenCalled();
    expect(persistMessage).toHaveBeenCalled();
  });

  it("does nothing for blank input", async () => {
    const args = setup({ chatInput: "   " });
    const { result } = renderHook(() => useChatActions(args as never));
    await act(async () => { await result.current.sendMsg(); });
    expect(persistMessage).not.toHaveBeenCalled();
  });
});
