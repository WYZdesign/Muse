// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSessTabRealign } from "./useSessTabRealign";
import { viewerSide } from "@/lib/role";

const initialSessTab = () => "sessions" as const;

describe("useSessTabRealign", () => {
  it("keeps the initial tab until a real type lands", () => {
    const { result } = renderHook(
      ({ t }: { t: string | undefined }) => useSessTabRealign({ currentUserType: t, initialSessTab }),
      { initialProps: { t: undefined as string | undefined } },
    );
    expect(result.current.sessTab).toBe("sessions");
  });

  it("realigns to the role-appropriate tab when the type changes", () => {
    const { result, rerender } = renderHook(
      ({ t }: { t: string }) => useSessTabRealign({ currentUserType: t, initialSessTab }),
      { initialProps: { t: "Photographer" } },
    );
    rerender({ t: "Studio" });
    const expected = viewerSide("Studio") === "industry" ? "bookings" : "sessions";
    expect(result.current.sessTab).toBe(expected);
  });

  it("does not realign when the type stays the same", () => {
    const { result, rerender } = renderHook(
      ({ t }: { t: string }) => useSessTabRealign({ currentUserType: t, initialSessTab }),
      { initialProps: { t: "Photographer" } },
    );
    result.current.setSessTab("bookings");
    rerender({ t: "Photographer" });
    expect(result.current.sessTab).toBe("bookings");
  });
});
