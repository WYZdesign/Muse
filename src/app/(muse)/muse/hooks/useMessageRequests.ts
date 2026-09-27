"use client";

import { useEffect, useState } from "react";
import { DEMO_MODE } from "../page-constants";
import { PROFILES } from "../components/types";

/**
 * Pending message-request fetch, extracted verbatim from page.tsx. Same
 * screen/auth guard, same DEMO_MODE seeding, same [apiFetch, screen, authUser]
 * deps.
 */
export type UseMessageRequestsArgs = {
  screen: string;
  authUser: unknown;
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
};

export function useMessageRequests({ screen, authUser, apiFetch }: UseMessageRequestsArgs) {
  const [messageRequests, setMessageRequests] = useState<unknown[]>([]);

  // ─── MESSAGE REQUESTS: Fetch pending requests when on matches screen ───
  useEffect(() => {
    if (screen !== "matches" || !authUser) return;
    // Populated demo Inbox. The live endpoint requires a real account, so demo
    // mode always rendered "No pending requests". Owner requirement: demo must
    // look published.
    if (DEMO_MODE) {
      setMessageRequests(PROFILES.slice(14, 17).map((p, i) => ({
        id: `demo-req-${i}`, from_id: { id: p.id, name: p.name, avatar: p.img },
        text: i === 0 ? "Hi! Loved your editorial series — are you booking for June?" : i === 1 ? "Would you be open to a styled test shoot next month?" : "Hey! Big fan of your lighting work. Could we collab?",
        created_at: new Date(Date.now() - (i + 1) * 5400000).toISOString(),
      })));
      return;
    }
    apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "message-requests" }) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.requests) setMessageRequests(data.requests); })
      .catch(() => {});
  }, [apiFetch, screen, authUser]);

  return { messageRequests, setMessageRequests };
}
