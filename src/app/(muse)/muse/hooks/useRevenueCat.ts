"use client";

import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Purchases, CustomerInfo, PurchasesOffering, LOG_LEVEL } from "@revenuecat/purchases-capacitor";

interface MuseEntitlements {
  pro: boolean;
  founding: boolean;
  earlyMember: boolean;
}

export function useRevenueCat() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setLoading(false);
      return;
    }

    try {
      // Configure RevenueCat
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      // These keys should be set via environment or config
      const iosApiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY || "";
      const androidApiKey = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY || "";
      
      if (Capacitor.getPlatform() === "ios" && iosApiKey) {
        await Purchases.configure({ apiKey: iosApiKey, appUserID: null });
      } else if (Capacitor.getPlatform() === "android" && androidApiKey) {
        await Purchases.configure({ apiKey: androidApiKey, appUserID: null });
      }

      // Sync purchases on app launch
      await Purchases.syncPurchases();
      
      // Get current customer info
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info.customerInfo);
      
      // Get available offerings
      const off = await Purchases.getOfferings();
      if (off.current) {
        setOfferings(off.current);
      }
    } catch (e: unknown) {
      console.error("RevenueCat init failed:", e);
      setError(e instanceof Error ? e.message : "Failed to initialize purchases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const purchasePackage = useCallback(async (pkg: any) => {
    try {
      const { customerInfo: newInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      setCustomerInfo(newInfo);
      return { success: true, customerInfo: newInfo };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "Purchase failed";
      if (!error.includes("user cancelled")) {
        setError(error);
      }
      return { success: false, error };
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info.customerInfo);
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : "Restore failed" };
    }
  }, []);

  const entitlements: MuseEntitlements = {
    pro: customerInfo?.entitlements.active["muse_pro"] !== undefined,
    founding: customerInfo?.entitlements.active["founding_member"] !== undefined,
    earlyMember: customerInfo?.entitlements.active["early_member"] !== undefined,
  };

  return {
    customerInfo,
    offerings,
    loading,
    error,
    entitlements,
    purchasePackage,
    restorePurchases,
    isPro: entitlements.pro,
  };
}

export async function syncRevenueCatUser(userId: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Purchases.logIn({ appUserID: userId });
    await Purchases.syncPurchases();
  } catch (e) {
    console.error("RevenueCat login failed:", e);
  }
}

export async function logoutRevenueCat() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.error("RevenueCat logout failed:", e);
  }
}