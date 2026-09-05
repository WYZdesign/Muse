"use client";
import { useState } from "react";

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
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [obStep, setObStep] = useState(0);
  const [obData, setObData] = useState<{ name?: string; loc?: string; bio?: string; type?: string; looking?: string[]; conn?: string[]; styles?: string[]; zodiac?: string; chinese?: string; mbti?: string; lifePath?: number; referralCode?: string }>({});

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
