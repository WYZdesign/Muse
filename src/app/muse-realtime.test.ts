import { describe, it, expect, vi } from "vitest";

// Capture the postgres_changes INSERT handler each test registers, so a test
// can simulate a live row arriving without a real Supabase connection.
let capturedInsertHandler: ((payload: unknown) => void) | null = null;
let capturedUpdateHandler: ((payload: unknown) => void) | null = null;

// muse-realtime.ts builds/imports the supabase client at module load; stub the
// heavy modules so the pure distance helper can be tested in isolation.
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {},
    channel: () => {
      // Chainable so any number of .on() registrations work; captures the
      // INSERT (new message) and UPDATE (read receipt) handlers separately.
      const chain = {
        on: (event: string, config: unknown, handler?: (payload: unknown) => void) => {
          if (event === "postgres_changes" && handler) {
            const ev = (config as { event?: string } | null)?.event;
            if (ev === "UPDATE") capturedUpdateHandler = handler;
            else capturedInsertHandler = handler;
          }
          return chain;
        },
        subscribe: () => ({}),
      };
      return chain;
    },
    removeChannel: () => {},
  },
}));
vi.mock("@/app/(muse)/muse/lib/auth-client", () => ({ authFetch: vi.fn() }));
vi.mock("@/lib/errorTracker", () => ({ trackError: vi.fn() }));

import { distanceMiles, subscribeToConversation } from "./muse-realtime";

describe("distanceMiles (haversine)", () => {
  it("is zero for the same point", () => {
    expect(distanceMiles({ lat: 34.05, long: -118.24 }, { lat: 34.05, long: -118.24 })).toBe(0);
  });

  it("measures one degree of latitude as ~69 miles", () => {
    const d = distanceMiles({ lat: 0, long: 0 }, { lat: 1, long: 0 });
    expect(d).toBeGreaterThanOrEqual(68);
    expect(d).toBeLessThanOrEqual(70);
  });

  it("measures LA to NYC at roughly 2,450 miles", () => {
    const d = distanceMiles({ lat: 34.0522, long: -118.2437 }, { lat: 40.7128, long: -74.006 });
    expect(d).toBeGreaterThanOrEqual(2400);
    expect(d).toBeLessThanOrEqual(2500);
  });

  it("is symmetric", () => {
    const a = { lat: 51.5074, long: -0.1278 };
    const b = { lat: 48.8566, long: 2.3522 };
    expect(distanceMiles(a, b)).toBe(distanceMiles(b, a));
  });
});

describe("subscribeToConversation — live INSERT row mapping", () => {
  // Regression: onMessage used to be called as (sender, text, img) only,
  // dropping kind/media_url/media_type/duration_ms/transcript from the raw
  // row — a voice/video note received while the chat was open rendered as a
  // blank bubble. The row's fields now come through as a 4th "extras" arg,
  // mapped the same way fetchConversationHistory() already maps a reload.
  it("forwards kind/mediaUrl/mediaType/durationMs/transcript from the raw row as extras", () => {
    capturedInsertHandler = null;
    const onMessage = vi.fn();
    subscribeToConversation({ myId: "me", theirId: "them", onMessage });
    expect(capturedInsertHandler).toBeTruthy();

    capturedInsertHandler!({
      new: {
        sender_id: "them",
        text: "",
        img: null,
        kind: "voice",
        media_url: "https://cdn.example/clip.webm",
        media_type: "audio/webm",
        duration_ms: 3100,
        transcript: "hello there",
      },
    });

    expect(onMessage).toHaveBeenCalledWith("them", "", undefined, {
      kind: "voice",
      mediaUrl: "https://cdn.example/clip.webm",
      mediaType: "audio/webm",
      durationMs: 3100,
      transcript: "hello there",
    });
  });

  // Read receipts: the receiver's mark-read UPDATE must reach onRead so the
  // sender's tick can go live without reopening the thread.
  it("forwards a read_at UPDATE to onRead", () => {
    const onRead = vi.fn();
    subscribeToConversation({ myId: "me", theirId: "them", onMessage: () => {}, onRead });
    expect(capturedUpdateHandler).not.toBeNull();
    capturedUpdateHandler?.({ new: { read_at: "2026-10-19T00:00:00.000Z" } });
    expect(onRead).toHaveBeenCalledWith("2026-10-19T00:00:00.000Z");
  });
  it("ignores the sender's own echo", () => {
    capturedInsertHandler = null;
    const onMessage = vi.fn();
    subscribeToConversation({ myId: "me", theirId: "them", onMessage });
    capturedInsertHandler!({ new: { sender_id: "me", text: "hi" } });
    expect(onMessage).not.toHaveBeenCalled();
  });
});
