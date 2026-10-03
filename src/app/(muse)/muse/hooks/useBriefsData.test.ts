// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBriefsData } from "./useBriefsData";

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });

describe("useBriefsData", () => {
  it("does not fetch without a profileId", () => {
    const f = vi.fn();
    renderHook(() => useBriefsData({ authFetch: f, profileId: null }));
    expect(f).not.toHaveBeenCalled();
  });

  it("loads and normalizes briefs", async () => {
    const f = vi.fn(async () => json({ briefs: [{ id: 1, title: "T", author_id: { name: "Ada" } }] }));
    const { result } = renderHook(() => useBriefsData({ authFetch: f, profileId: "u1" }));
    await waitFor(() => expect(result.current.liveBriefs).toHaveLength(1));
    expect(result.current.liveBriefs![0].author).toBe("Ada");
  });
});
