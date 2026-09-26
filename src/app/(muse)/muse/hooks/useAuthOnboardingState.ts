"use client";
import { useState, useEffect } from "react";

export type OnboardingData = {
  name?: string;
  loc?: string;
  bio?: string;
  type?: string;
  looking?: string[];
  conn?: string[];
  styles?: string[];
  zodiac?: string;
  chinese?: string;
  mbti?: string;
  lifePath?: number;
  referralCode?: string;
  mediaKitUrl?: string;
  audience?: "creative" | "industry";
  customTypePending?: boolean;
  customStylePending?: boolean;
  showCustomStyleInput?: boolean;
  customStyleDraft?: string;
};

/**
 * Auth + onboarding state, extracted from page.tsx. Covers the login/signup
 * form (authMode/authEmail/authPass/authName/authLoading/formErrors), the
 * main onboarding step/data (obStep/obData), and the personality-discovery
 * test flow (testScreen/testBirthMonth/testBirthDay/testBirthYear/
 * testMbtiAnswers/testLevels/obSelects/
 * obTestKey/obTestStep/obProfilePic/obConnectedSocials/obPortfolioItems/
 * obPortfolioSlot). Third cluster in the page.tsx state extraction (per
 * wyzmind's handoff, after modal-visibility and quests). Same proven
 * pattern as useChatState/useModalVisibility/useQuestsState — identical
 * names in and out, so no call site elsewhere in page.tsx needed to change.
 *
 * Deliberately NOT included: `_obStep10Known`/`_setObStep10Known` (line-level
 * dead state, unused beyond its own declaration — left untouched to keep
 * this a pure state-relocation, not a dead-code cleanup).
 */
export function useAuthOnboardingState() {
  // Default to the Log In tab: returning users are the common case, and landing
  // on Sign Up made them re-click every time. (Was "signup".)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // "Remember me" — when on (default) the signed-in session is persisted in
  // `muse_v1` (auto sign-in on return) and the email is pre-filled next time.
  // When off, `authUser` is deliberately NOT written to persisted state, so
  // closing the browser signs the user out. Persisted as `muse_remember`.
  const [authRemember, setAuthRememberState] = useState(true);

  const setAuthRemember = (v: boolean) => {
    setAuthRememberState(v);
    try { localStorage.setItem("muse_remember", v ? "1" : "0"); } catch { /* storage unavailable */ }
  };

  // Restore the remember flag + saved email on mount (after hydration, so the
  // server-rendered empty field and the client render agree on first paint).
  useEffect(() => {
    try {
      const remember = localStorage.getItem("muse_remember") !== "0";
      setAuthRememberState(remember);
      if (remember) {
        const saved = localStorage.getItem("muse_remember_email");
        if (saved) setAuthEmail(prev => prev || saved);
      }
    } catch { /* storage unavailable */ }
  }, []);

  const [obStep, setObStep] = useState(0);
  const [obData, setObData] = useState<OnboardingData>({});

  const [testScreen, setTestScreen] = useState<"zodiac" | "mbti" | "chinese" | "lifepath" | "done" | null>(null);
  const [testBirthMonth, setTestBirthMonth] = useState("");
  const [testBirthDay, setTestBirthDay] = useState("");
  const [testBirthYear, setTestBirthYear] = useState("");
  const [testMbtiAnswers, setTestMbtiAnswers] = useState<Record<string, string>>({});
  const [testLevels, setTestLevels] = useState<{ zodiac: number; mbti: number; chinese: number; lifePath: number }>({ zodiac: 1, mbti: 1, chinese: 1, lifePath: 1 });
  const [obSelects, setObSelects] = useState<string[]>([]);
  const [obTestKey, setObTestKey] = useState<string>("");
  const [obTestStep, setObTestStep] = useState(0);
  const [obProfilePic, setObProfilePic] = useState<string | null>(null);
  const [obConnectedSocials, setObConnectedSocials] = useState<Record<string, boolean>>({});
  const [obPortfolioItems, setObPortfolioItems] = useState<{ img: string; title: string }[]>([]);
  const [obPortfolioSlot, setObPortfolioSlot] = useState<number | null>(null);

  return {
    authMode, setAuthMode,
    authEmail, setAuthEmail,
    authPass, setAuthPass,
    authName, setAuthName,
    authLoading, setAuthLoading,
    formErrors, setFormErrors,
    authRemember, setAuthRemember,
    obStep, setObStep,
    obData, setObData,
    testScreen, setTestScreen,
    testBirthMonth, setTestBirthMonth,
    testBirthDay, setTestBirthDay,
    testBirthYear, setTestBirthYear,
    testMbtiAnswers, setTestMbtiAnswers,
    testLevels, setTestLevels,
    obSelects, setObSelects,
    obTestKey, setObTestKey,
    obTestStep, setObTestStep,
    obProfilePic, setObProfilePic,
    obConnectedSocials, setObConnectedSocials,
    obPortfolioItems, setObPortfolioItems,
    obPortfolioSlot, setObPortfolioSlot,
  };
}
