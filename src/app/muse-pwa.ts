"use client";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem("muse_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
}

export async function registerMuseServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw-muse.js", { scope: "/", updateViaCache: "none" });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.error("[muse-pwa] SW registration failed", e);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export async function subscribeToMusePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, error: "Push not supported in this browser" };
    }
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      return { ok: false, error: "VAPID public key not configured" };
    }

    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      return { ok: false, error: "Notification permission not granted" };
    }

    const reg = await registerMuseServiceWorker();
    if (!reg) return { ok: false, error: "Service worker registration failed" };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      });
    }

    const accessToken = getAccessToken();
    if (!accessToken) return { ok: false, error: "Not authenticated" };

    const subscription = {
      endpoint: sub.endpoint,
      p256dh: sub.toJSON().keys?.p256dh || "",
      auth: sub.toJSON().keys?.auth || "",
    };

    const res = await fetch("/api/muse/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "subscribe", subscription, access_token: accessToken }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { ok: false, error: data.error || "Subscription upload failed" };
    }
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function unsubscribeFromMusePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!("serviceWorker" in navigator)) return { ok: true };
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return { ok: true };
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return { ok: true };

    const endpoint = sub.endpoint;
    const accessToken = getAccessToken();

    await sub.unsubscribe();

    if (accessToken) {
      await fetch("/api/muse/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unsubscribe", subscription: { endpoint }, access_token: accessToken }),
      });
    }
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function ensureMusePushRegistered(): Promise<void> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const reg = await registerMuseServiceWorker();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const res = await subscribeToMusePush();
      if (!res.ok) console.error("[muse-pwa] auto-subscribe failed", res.error);
    }
  } catch (e) {
    console.error("[muse-pwa] ensureMusePushRegistered failed", e);
  }
}

// Prevent browser scroll restoration from leaving the app shell shifted
if (typeof window !== "undefined") { try { history.scrollRestoration = "manual"; } catch {} }
