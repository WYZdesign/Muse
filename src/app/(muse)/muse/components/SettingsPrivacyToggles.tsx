/** Privacy and visibility toggle list for SettingsScreen, extracted from its inline block so the screen stays inside its size budget: Zodiac/MBTI/Life Path/Chinese are free for every user, while Distance, Age, Online Status, Match % and Incognito are Musa Pro and open the shared upsell instead of toggling. */
"use client";

import { ToggleRow } from "./SettingsToggleRow";
import { isPaidTier } from "./subscriptionTiers";
import type { UpsellInfo } from "../modals/types";

type ToggleDef = {
  key: string;
  label: string;
  pro?: boolean;
  feature?: string;
  reason?: string;
  icon?: string;
};

// Order matters: it is the order the rows render in Settings > Privacy & Safety.
const TOGGLES: ToggleDef[] = [
  { key: "showDistance", label: "Show Distance", pro: true, feature: "Show Distance", reason: "Let people see how close you are. Upgrade to Musa Pro to control whether your distance is shown on your profile.", icon: "📍" },
  { key: "showZodiac", label: "Zodiac Sign" },
  { key: "showAge", label: "Age", pro: true, feature: "Hide Age", reason: "Keep your age private. Upgrade to Musa Pro to control whether your age is shown on your profile.", icon: "🎂" },
  { key: "showMbti", label: "MBTI Type" },
  { key: "showLifePath", label: "Life Path Number" },
  { key: "showChinese", label: "Chinese Zodiac" },
  { key: "showOnline", label: "Online Status", pro: true, feature: "Hide Online Status", reason: "Control who sees when you're active. Upgrade to Musa Pro to hide your online status from other members.", icon: "🟢" },
  { key: "showMatchPercent", label: "Match % Visible to Others", pro: true, feature: "Hide Match %", reason: "Keep your match-percentage private. Upgrade to Musa Pro to control whether others see how well you match with them.", icon: "✨" },
  { key: "incognito", label: "Incognito Mode", pro: true, feature: "Incognito Mode", reason: "Browse without being seen. Upgrade to Musa Pro to keep your profile out of everyone else's Discover deck.", icon: "🔒" },
];

/** `values` are the already-resolved booleans (e.g. "shown unless explicitly false"). */
export function SettingsPrivacyToggles({
  values,
  onChange,
  userTier,
  setUpsell,
  apiFetch,
  showToast,
}: {
  values: Record<string, boolean>;
  onChange: (key: string, next: boolean) => void;
  userTier?: string;
  setUpsell?: (v: UpsellInfo | null) => void;
  apiFetch?: (url: string, opts?: RequestInit) => Promise<Response>;
  showToast: (msg: string) => void;
}) {
  return (
    <>
      {TOGGLES.map((t) => {
        const checked = !!values[t.key];
        return (
          <ToggleRow
            key={t.key}
            label={t.label}
            desc={t.pro ? "Musa Pro" : undefined}
            checked={checked}
            onToggle={() => {
              if (t.pro && !isPaidTier(userTier)) {
                setUpsell?.({ feature: t.feature || t.label, reason: t.reason || "", icon: t.icon });
                return;
              }
              const next = !checked;
              onChange(t.key, next);
              apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { [t.key]: next } }) }).catch(() => showToast("Couldn't save — try again"));
            }}
          />
        );
      })}
    </>
  );
}
