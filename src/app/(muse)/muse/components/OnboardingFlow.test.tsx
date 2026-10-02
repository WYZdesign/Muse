import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OnboardingFlow, type OnboardingFlowProps } from "./OnboardingFlow";

/**
 * Smoke render for the extracted OnboardingFlow (hook-free). It's a large
 * presentational component, so this asserts it renders without throwing and
 * emits the onboarding shell for the first step. Dep-free (react-dom/server).
 */
function props(over: Partial<OnboardingFlowProps> = {}): OnboardingFlowProps {
  return {
    obStep: 0,
    setObStep: vi.fn(),
    obData: {},
    setObData: vi.fn(),
    obConnectedSocials: {},
    obPortfolioItems: [],
    setObPortfolioItems: vi.fn(),
    obPortfolioSlot: null,
    setObPortfolioSlot: vi.fn(),
    obProfilePic: null,
    setObProfilePic: vi.fn(),
    testScreen: null,
    setTestScreen: vi.fn(),
    testBirthMonth: "",
    testBirthDay: "",
    testBirthYear: "",
    setTestBirthMonth: vi.fn(),
    setTestBirthDay: vi.fn(),
    setTestBirthYear: vi.fn(),
    testMbtiAnswers: {},
    setTestMbtiAnswers: vi.fn(),
    setCurrentUser: vi.fn(),
    setScreen: vi.fn(),
    uploadImage: vi.fn(),
    toggleObMulti: vi.fn(),
    toggleSocial: vi.fn(),
    showToast: vi.fn(),
    authFetch: vi.fn(),
    authUser: null,
    photoInputRef: { current: null },
    portfolioInputRef: { current: null },
    ...over,
  } as unknown as OnboardingFlowProps;
}

describe("OnboardingFlow", () => {
  it("renders the onboarding shell for step 0 without throwing", () => {
    const out = renderToStaticMarkup(createElement(OnboardingFlow, props()));
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain("onboard");
  });
});
