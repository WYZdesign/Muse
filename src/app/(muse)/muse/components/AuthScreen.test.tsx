import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthScreen, type AuthScreenProps } from "./AuthScreen";

/**
 * Direct render test for the extracted AuthScreen (hook-free). Uses
 * react-dom/server so it stays dependency-free (no jsdom/testing-library).
 */
function props(over: Partial<AuthScreenProps> = {}): AuthScreenProps {
  return {
    authMode: "login",
    setAuthMode: vi.fn(),
    authEmail: "",
    setAuthEmail: vi.fn(),
    formErrors: {},
    setFormErrors: vi.fn(),
    authPass: "",
    setAuthPass: vi.fn(),
    showPass: false,
    setShowPass: vi.fn(),
    authRemember: true,
    setAuthRemember: vi.fn(),
    authLoading: false,
    setAuthLoading: vi.fn(),
    authFetch: vi.fn(),
    showToast: vi.fn(),
    handleAuthClick: vi.fn(),
    handleOAuth: vi.fn(),
    setShowTerms: vi.fn(),
    setShowPrivacy: vi.fn(),
    setShowGuidelines: vi.fn(),
    ...over,
  } as unknown as AuthScreenProps;
}

const html = (over: Partial<AuthScreenProps> = {}) =>
  renderToStaticMarkup(createElement(AuthScreen, props(over)));

describe("AuthScreen", () => {
  it("renders the login form with tabs, inputs and remember-me", () => {
    const out = html();
    expect(out).toContain("Log In");
    expect(out).toContain("Sign Up");
    expect(out).toContain('aria-label="Email address"');
    expect(out).toContain('aria-label="Password"');
    expect(out).toContain("Remember me");
    expect(out).toContain("Forgot password?");
  });

  it("shows Create Account in signup mode", () => {
    expect(html({ authMode: "signup" })).toContain("Create Account");
  });

  it("renders OAuth providers and the policy links", () => {
    const out = html();
    expect(out).toContain("Google");
    expect(out).toContain("Facebook");
    expect(out).toContain("Terms");
    expect(out).toContain("Privacy");
    expect(out).toContain("Guidelines");
  });

  it("surfaces a field error", () => {
    expect(html({ formErrors: { email: "Enter a valid email" } })).toContain("Enter a valid email");
  });

  it("disables the submit button while loading", () => {
    const out = html({ authLoading: true });
    expect(out).toContain("Loading...");
    expect(out).toContain("disabled");
  });
});
