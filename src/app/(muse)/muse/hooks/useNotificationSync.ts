"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { uid } from "../lib/uid";
import type { Notification, ProfileViewer } from "../page-models";

export type ActivityFeedItem = {
  id: number;
  type: string;
  from: string;
  avatar: string;
  text: string;
  time: string;
  read: boolean;
};

/**
 * Server-backed notification surfaces, extracted verbatim from page.tsx:
 * the unread-count poll, the "who viewed my profile" pull (which also feeds
 * the activity feed) and the profile-open notification merge. These three
 * effects form one domain and are relocated together. Their original relative
 * order is preserved (poll → viewers → merge); the merge previously sat much
 * later because it depends on `authUser?.profile?.id`, not on any other
 * effect, so moving it up beside its siblings does not change wiring. Guards,
 * intervals, dedup logic and dependency arrays are unchanged.
 */
export type UseNotificationSyncArgs = {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  authUser: { id?: string; profile?: { id?: string } } | null;
  setProfileViewers: Dispatch<SetStateAction<{ name: string; avatar: string; time: string }[]>>;
  setActivityFeed: Dispatch<SetStateAction<ActivityFeedItem[]>>;
};

export function useNotificationSync({
  authFetch,
  authUser,
  setProfileViewers,
  setActivityFeed,
}: UseNotificationSyncArgs) {
  const [serverNotifCount, setServerNotifCount] = useState(0);

  // Poll the server's unread-notification count so the menu/bottom-nav bell
  // reflects real DB rows (matches, likes, bookings, reviews, brief apps, etc.)
  // and not just the local activityFeed. Only when the user is authed.
  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await authFetch("/api/muse?type=notification-count");
        if (cancelled) return;
        const d = await r.json();
        if (d && typeof d.count === "number") setServerNotifCount(d.count);
      } catch { console.debug("[muse] client preference refresh failed"); }
    };
    poll();
    const iv = setInterval(poll, 20000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [authUser?.id]);

  // Pull the real "who viewed my profile" list so the Profile Activity section
  // shows genuine viewer avatars/names (fed by track-view → profile_view rows),
  // not just the local activityFeed. Feed them into activityFeed as deduped
  // "viewed your profile" items too, so the section is populated from the DB.
  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const r = await authFetch("/api/muse?type=profile-viewers");
        if (cancelled) return;
        const d = await r.json();
        if (d && Array.isArray(d.viewers)) {
          setProfileViewers(d.viewers);
          // Merge new viewer rows into the activity feed (dedup by viewer id),
          // placed chronologically by view time.
          setActivityFeed(prev => {
            const existingViewerIds = new Set<string | number>(prev.filter(x => x.type === "profile_view").map(x => x.id));
            const newItems = d.viewers
              .filter((v: ProfileViewer) => !existingViewerIds.has(v.id || ""))
              .map((v: ProfileViewer) => ({
                id: v.id || uid(),
                type: "profile_view",
                from: v.name || "Someone",
                avatar: v.avatar || "",
                text: "viewed your profile",
                time: v.viewedAt ? (() => { const ms = Date.now() - new Date(v.viewedAt).getTime(); const m = Math.floor(ms / 60000); if (m < 1) return "Just now"; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; })() : "",
                read: true,
              }));
            return [...newItems, ...prev];
          });
        }
      } catch { console.debug("[muse] notification count refresh failed"); }
    };
    pull();
    const iv = setInterval(pull, 60000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [authUser?.id]);

  // Merge server-side notifications (bookings, connections, check-ins) into the
  // activity feed so the Activity modal shows real DB rows, not just local events.
  useEffect(() => {
    const pid = authUser?.profile?.id;
    if (!pid) return;
    let cancelled = false;
    authFetch("/api/muse?type=notifications")
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        const list = (j.notifications || []) as Notification[];
        if (!list.length) return;
        setActivityFeed(prev => {
          // Dedup by stable id, not by body text: two DIFFERENT notifications
          // can legitimately share identical text (e.g. two "Someone liked your
          // post" events), and the old text-based dedup silently dropped the
          // second one.
          const existing = new Set<number | undefined>(prev.map(a => a.id));
          const mapped = list
            .filter(n => n && n.body && !existing.has(n.id))
            .map((n) => ({
              id: n.id ?? uid(),
              type: n.type || "info",
              // Audit fix (Torreé batch Part B item 8): this used to
              // hardcode from/avatar to "" for every server-sourced
              // notification, which is what made ProfileScreen's Activity
              // tab show a generic "Someone" / ghost "S" avatar even when
              // the real sender's name and photo were available. The GET
              // ?type=notifications handler now embeds + normalizes the
              // sender profile (from_id -> muse_profiles) onto n.from/
              // n.avatar directly, same as feedbackGetNotifications
              // already did for MenuModal's own panel — a genuinely
              // senderless system notification (no from_id, e.g. a
              // booking reminder) still falls back to "Someone"/"S"
              // downstream, which is correct for those, not a bug.
              from: n.from || "",
              avatar: n.avatar || "",
              text: String(n.body),
              time: n.created_at ? new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "",
              read: !!n.read,
            }));
          return mapped.length ? [...mapped.reverse(), ...prev] : prev;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [authUser?.profile?.id]);

  return { serverNotifCount };
}
