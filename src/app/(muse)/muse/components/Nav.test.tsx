import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Nav from "./Nav";
import type { MuseRole } from "@/lib/role";

/**
 * Direct render tests for the extracted Nav (hook-free, so react-dom/server
 * keeps this dependency-free like AuthScreen.test.tsx). The role-aware labels
 * are a real contract: the e2e helpers and user-journey.spec.ts click the
 * "Musa" tab by aria-label, and navTabLabel() is what maps matches -> Musa.
 */
const noop = () => {};

const html = (over: { active?: string; role?: MuseRole; unreadCount?: number } = {}) =>
  renderToStaticMarkup(
    createElement(Nav, {
      active: over.active ?? "discover",
      onNavigate: noop,
      role: over.role ?? "creative",
      unreadCount: over.unreadCount,
    } as never),
  );

describe("Nav", () => {
  it("labels the tabs for a creative viewer", () => {
    const out = html({ role: "creative" });
    for (const label of ["Discover", "Feed", "Collab", "Musa", "BTS", "Menu"]) {
      expect(out, `creative nav should expose ${label}`).toContain(`aria-label="${label}"`);
    }
  });

  it("labels the same tabs differently for a muse viewer", () => {
    const out = html({ role: "muse" });
    for (const label of ["Scout", "Feed", "Briefs", "Talent", "BTS"]) {
      expect(out, `muse nav should expose ${label}`).toContain(`aria-label="${label}"`);
    }
    // The creative-only labels must not leak into the muse nav.
    expect(out).not.toContain('aria-label="Discover"');
    expect(out).not.toContain('aria-label="Musa"');
    expect(out).not.toContain('aria-label="Collab"');
  });

  it("marks exactly one tab as the current page", () => {
    for (const active of ["discover", "matches", "bts"]) {
      const out = html({ active });
      const current = out.match(/aria-current="page"/g) ?? [];
      expect(current.length, `only ${active} should be current`).toBe(1);
    }
  });

  it("renders a Main navigation landmark and a Menu control", () => {
    const out = html();
    expect(out).toContain('role="navigation"');
    expect(out).toContain('aria-label="Main navigation"');
    expect(out).toContain('aria-label="Menu"');
  });

  it("caps the unread badge at 99+ and omits it when there is nothing unread", () => {
    expect(html({ unreadCount: 250 })).toContain("99+");
    const none = html({ unreadCount: 0 });
    expect(none).not.toContain("99+");
  });
});
