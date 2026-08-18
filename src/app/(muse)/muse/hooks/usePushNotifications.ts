"use client";

import { useEffect, useCallback, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, PushNotificationSchema, Token, ActionPerformed } from "@capacitor/push-notifications";

type PermissionStatus = "prompt" | "granted" | "denied" | "prompt-with-rationale";

interface PushConfig {
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onActionPerformed?: (action: ActionPerformed) => void;
}

export function usePushNotifications(config: PushConfig = {}) {
  const [token, setToken] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionStatus>("prompt");
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const permResult = await PushNotifications.requestPermissions();
      const receiveState = permResult.receive === "granted" ? "granted" : permResult.receive === "denied" ? "denied" : "prompt";
      setPermissionState(receiveState);
      
      if (permResult.receive === "granted") {
        await PushNotifications.register();
      } else {
        setError("Push permission denied");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Push registration failed");
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    register().then(() => {
      if (cancelled) return;
      
      const setupListeners = async () => {
        const tokenListener = await PushNotifications.addListener("registration", (tokenObj: Token) => {
          setToken(tokenObj.value);
          sendTokenToBackend(tokenObj.value);
        });

        const errorListener = await PushNotifications.addListener("registrationError", (err: { error: string }) => {
          setError(err.error);
        });

        const notificationListener = await PushNotifications.addListener("pushNotificationReceived", (notification: PushNotificationSchema) => {
          config.onNotificationReceived?.(notification);
        });

        const actionListener = await PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
          config.onActionPerformed?.(action);
        });

        return () => {
          tokenListener.remove();
          errorListener.remove();
          notificationListener.remove();
          actionListener.remove();
        };
      };

      setupListeners().then(cleanup => {
        if (!cancelled) {
          return cleanup;
        }
      });
    });

    return () => { cancelled = true; };
  }, [register, config]);

  const sendTokenToBackend = useCallback(async (pushToken: string) => {
    // /api/muse/push only accepts Web Push subscription payloads
    // ({action, subscription, access_token}). Native device tokens
    // (APNs/FCM) need a dedicated route + table — until that exists this is
    // a deliberate no-op so a malformed payload is never POSTed.
    void pushToken;
  }, []);

  return { token, permissionState, error, register };
}

// Web fallback - uses existing service worker push (muse-pwa.ts)
export function useWebPush() {
  return { subscribe: () => Promise.resolve(), unsubscribe: () => Promise.resolve() };
}