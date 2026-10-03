// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatState } from "./useChatState";

describe("useChatState", () => {
  it("has neutral initial state", () => {
    const { result } = renderHook(() => useChatState());
    expect(result.current.chatTarget).toBeNull();
    expect(result.current.chatInput).toBe("");
    expect(result.current.showMatchMenu).toBe(false);
    expect(result.current.unmatchTarget).toBeNull();
    expect(result.current.chatImages).toEqual({});
    expect(result.current.typingTarget).toBeNull();
    expect(result.current.themTyping).toBe(false);
  });

  it("tracks a draft, typing, and image attachments", () => {
    const { result } = renderHook(() => useChatState());
    act(() => result.current.setChatInput("hey"));
    act(() => result.current.setThemTyping(true));
    act(() => result.current.setTypingTarget(7));
    act(() => result.current.setChatImages((p) => ({ ...p, 7: ["a.jpg"] })));
    expect(result.current.chatInput).toBe("hey");
    expect(result.current.themTyping).toBe(true);
    expect(result.current.typingTarget).toBe(7);
    expect(result.current.chatImages[7]).toEqual(["a.jpg"]);
  });
});
