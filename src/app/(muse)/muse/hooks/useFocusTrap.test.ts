// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { render, act, cleanup } from "@testing-library/react";
import { useFocusTrap } from "./useFocusTrap";

function Trap({ onClose, active }: { onClose: () => void; active: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(active, onClose);
  return createElement("div", { ref }, createElement("button", null, "Inside"));
}

describe("useFocusTrap", () => {
  it("focuses the first focusable when active", () => {
    render(createElement(Trap, { onClose: vi.fn(), active: true }));
    expect(document.activeElement?.textContent).toBe("Inside");
    cleanup();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(createElement(Trap, { onClose, active: true }));
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("does nothing when inactive", () => {
    const onClose = vi.fn();
    render(createElement(Trap, { onClose, active: false }));
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(onClose).not.toHaveBeenCalled();
    cleanup();
  });
});
