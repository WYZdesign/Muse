"use client";
import { useState, useCallback } from "react";

export function useSafetyState() {
  const [disclosureTarget, setDisclosureTarget] = useState<{ id: string; name: string } | null>(null);
  const [disclosureBookingId, setDisclosureBookingId] = useState<string | undefined>();
  const [existingDisclosure, setExistingDisclosure] = useState<Record<string, unknown> | null>(null);
  const [ageVerified, setAgeVerified] = useState(false);
  const [verificationExpiringSoon, setVerificationExpiringSoon] = useState(false);
  const [verificationBannerDismissed, setVerificationBannerDismissed] = useState(false);
  const [verificationBannerClosing, setVerificationBannerClosing] = useState(false);
  const [pendingDisclosureConfirm, setPendingDisclosureConfirm] = useState<string | null>(null);
  const [pendingDisclosureCreate, setPendingDisclosureCreate] = useState<Record<string, unknown> | null>(null);

  const dismissVerificationBanner = useCallback(() => {
    setVerificationBannerClosing(true);
    setTimeout(() => { setVerificationBannerDismissed(true); setVerificationBannerClosing(false); }, 320);
  }, []);

  return {
    disclosureTarget, setDisclosureTarget,
    disclosureBookingId, setDisclosureBookingId,
    existingDisclosure, setExistingDisclosure,
    ageVerified, setAgeVerified,
    verificationExpiringSoon, setVerificationExpiringSoon,
    verificationBannerDismissed, setVerificationBannerDismissed,
    verificationBannerClosing, setVerificationBannerClosing,
    pendingDisclosureConfirm, setPendingDisclosureConfirm,
    pendingDisclosureCreate, setPendingDisclosureCreate,
    dismissVerificationBanner,
  };
}