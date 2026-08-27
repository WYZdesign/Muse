import webPush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:legal@wyzdesign.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const keys = webPush.generateVAPIDKeys();
  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };
}

export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; icon?: string; data?: any; actions?: any[]; tag?: string; vibrate?: number[]; badge?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, error: "VAPID keys not configured" };
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webPush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      {
        vapidDetails: {
          subject: VAPID_SUBJECT,
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: VAPID_PRIVATE_KEY,
        },
        TTL: 24 * 60 * 60, // 24 hours
      }
    );
    return { success: true };
  } catch (error: any) {
    // Handle expired/invalid subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, error: "subscription_expired" };
    }
    return { success: false, error: error.message || "Push failed" };
  }
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; icon?: string; data?: any; actions?: any[]; tag?: string; vibrate?: number[]; badge?: string }
): Promise<{ sent: number; failed: number; expired: number }> {
  const sb = (await import("@/lib/supabase")).getServiceClient();

  const { data: subscriptions, error } = await sb
    .from("muse_push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subscriptions?.length) {
    return { sent: 0, failed: 0, expired: 0 };
  }

  let sent = 0;
  let failed = 0;
  let expired = 0;

  for (const sub of subscriptions) {
    const result = await sendPushNotification(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload
    );

    if (result.success) {
      sent++;
    } else if (result.error === "subscription_expired") {
      // Clean up expired subscription
      await (await import("@/lib/supabase")).getServiceClient()
        .from("muse_push_subscriptions")
        .delete()
        .eq("endpoint", sub.endpoint)
        .eq("user_id", userId);
      expired++;
    } else {
      failed++;
    }
  }

  return { sent, failed, expired };
}

// Backwards compatibility wrapper
export async function pushToProfile(
  userId: string,
  title: string,
  body: string,
  ctaUrl?: string
): Promise<void> {
  await sendPushToUser(userId, { title, body, data: { url: ctaUrl } });
}