// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { PublicProfileScreen, type PublicProfileScreenProps, type PublicProfileUser } from "./PublicProfileScreen";

/**
 * Regression coverage for the XL-1 any-purge (2026-10-08): typing
 * `reviews`/`feedPosts`/`trust` properly (instead of `any`) surfaced two
 * real demo-mode bugs where this screen's own demo-data literals used
 * different field names than the real API shape / its own render code
 * expects — so the data existed but silently never rendered. Both are
 * fixed in the same commit; these tests lock the fix in.
 */
afterEach(() => cleanup());

function user(over: Partial<PublicProfileUser> = {}): PublicProfileUser {
  return { id: "u1", name: "Jordan Lee", ...over };
}

function props(over: Partial<PublicProfileScreenProps> = {}): PublicProfileScreenProps {
  return {
    user: user(),
    onBack: vi.fn(),
    apiFetch: vi.fn(async () => new Response(JSON.stringify({}))),
    ...over,
  };
}

describe("PublicProfileScreen — demo-mode data (bug fix regression)", () => {
  it("renders the demo reviews' body text and reviewer name, not 'Anonymous'", async () => {
    render(<PublicProfileScreen {...props()} />);
    await waitFor(() => expect(screen.getByText(/Jordan Blake/)).toBeTruthy());
    expect(screen.getByText(/Absolutely nailed the brief/)).toBeTruthy();
    expect(screen.queryByText("Anonymous")).toBeNull();
  });

  it("renders the demo trust card's rating, boosted badge, response rate, and last-active tiles", async () => {
    const { container } = render(<PublicProfileScreen {...props()} />);
    await waitFor(() => expect(screen.getByText(/Trust & Track Record/)).toBeTruthy());
    const text = container.textContent || "";
    // The rating tile (trust.rating) used to never render because the demo
    // literal set `avgRating` instead of `rating`.
    expect(text).toMatch(/4\.73 reviews/);
    // The "Boosted" badge used to never render because the demo literal set
    // `boosted` instead of `isBoosted`.
    expect(text).toMatch(/Boosted/);
    // The response-rate tile used to never render because the demo literal
    // set `responseRatePct` instead of `responseRate`.
    expect(text).toMatch(/98%Response rate/);
    // The last-active tile used to never render because the demo literal
    // never set `lastSeenDaysAgo` at all.
    expect(text).toMatch(/TodayLast active/);
  });
});
