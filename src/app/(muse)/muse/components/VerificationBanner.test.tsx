import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VerificationBanner, type VerificationBannerProps } from "./VerificationBanner";

/**
 * Direct render test for the extracted VerificationBanner (hook-free, so it
 * renders under react-dom/server with no DOM/testing-library dependency).
 */
function props(over: Partial<VerificationBannerProps> = {}): VerificationBannerProps {
  return {
    ageVerified: false,
    verificationExpiringSoon: false,
    dismissed: false,
    closing: false,
    onVerify: vi.fn(),
    onDismiss: vi.fn(),
    ...over,
  };
}

const html = (over: Partial<VerificationBannerProps> = {}) =>
  renderToStaticMarkup(createElement(VerificationBanner, props(over)));

describe("VerificationBanner", () => {
  it("renders nothing when verified and not expiring", () => {
    expect(html({ ageVerified: true })).toBe("");
  });

  it("renders nothing when dismissed", () => {
    expect(html({ dismissed: true })).toBe("");
  });

  it("shows the verify + dismiss affordances when unverified", () => {
    const out = html();
    expect(out).toContain("Verify identity");
    expect(out).toContain("Verify Now");
    expect(out).toContain('aria-label="Dismiss"');
  });

  it("shows the expiry copy (and still renders) when a verified user is expiring", () => {
    const out = html({ ageVerified: true, verificationExpiringSoon: true });
    expect(out).toContain("expiring soon");
  });
});
