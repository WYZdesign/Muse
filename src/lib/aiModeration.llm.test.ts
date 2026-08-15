import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai", () => ({
  aiEnabled: () => true,
  chatComplete: vi.fn(),
}));

import { moderateText } from "./aiModeration";
import { chatComplete } from "@/lib/ai";

describe("moderateText (LLM classification path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks when LLM returns a critical classification", async () => {
    (chatComplete as any).mockResolvedValue(
      JSON.stringify({ safe: false, categories: ["minor_risk"], severity: "critical", reason: "test" })
    );
    const r = await moderateText("a normal sentence with no heuristic keywords");
    expect(r.safe).toBe(false);
    expect(r.recommendation).toBe("block");
    expect(r.usedLLM).toBe(true);
  });

  it("allows when LLM returns safe", async () => {
    (chatComplete as any).mockResolvedValue(
      JSON.stringify({ safe: true, categories: [], severity: "none", reason: "" })
    );
    const r = await moderateText("a normal sentence with no heuristic keywords");
    expect(r.safe).toBe(true);
    expect(r.usedLLM).toBe(true);
  });

  it("fails-open (safe) when LLM returns invalid JSON", async () => {
    (chatComplete as any).mockResolvedValue("this is not json");
    const r = await moderateText("a normal sentence with no heuristic keywords");
    expect(r.safe).toBe(true);
  });

  it("fails-open (safe) when LLM throws", async () => {
    (chatComplete as any).mockRejectedValue(new Error("network"));
    const r = await moderateText("a normal sentence with no heuristic keywords");
    expect(r.safe).toBe(true);
  });

  it("strips markdown fences around JSON", async () => {
    (chatComplete as any).mockResolvedValue('```json\n{"safe": false, "categories": ["spam"], "severity": "low", "reason": "x"}\n```');
    const r = await moderateText("a normal sentence with no heuristic keywords");
    expect(r.safe).toBe(false);
    expect(r.categories).toContain("spam");
  });
});
