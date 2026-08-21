import { getServiceClient } from "@/lib/supabase";
import webpush from "web-push";

/**
 * Web Push sender — fires browser push notifications to a profile's registered
 * subscriptions. Fail-open: never throws, and silently no-ops when VAPID keys
 * aren't configured (dev/local) or when a subscription has expired.
 */
let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webpush.setVapidDetails("mailto:info@wyzdesign.com", publicKey, privateKey);
    vapidConfigured = true;
  }
}

export async function pushToProfile(profileId: string, title: string, body: string, url?: string): Promise<void> {
  ensureVapid();
  if (!vapidConfigured) return;
  try {
    const sb = getServiceClient();
    const { data: subs } = await sb.from("muse_push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", profileId).limit(10);
    if (!subs?.length) return;
    const payload = JSON.stringify({ title, body, url: url || "https://muse.wyzdesign.com/muse" });
    await Promise.allSettled(subs.map((s: any) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      ).catch(() => {
        // On 404/410 (expired subscription), drop the dead record.
        getServiceClient().from("muse_push_subscriptions").delete().eq("endpoint", s.endpoint).then(() => {});
      })
    ));
  } catch { /* fail-open */ }
}
