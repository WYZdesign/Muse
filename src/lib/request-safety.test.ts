import { describe, it, expect } from "vitest";
import { sanitizeText } from "./request-safety";

describe("sanitizeText (XSS prevention)", () => {
  it("strips script tags (including their content)", () => {
    expect(sanitizeText("<script>alert('x')</script>hello")).toBe("hello");
  });

  it("strips all HTML tags", () => {
    expect(sanitizeText("<b>bold</b> text")).toBe("bold text");
  });

  it("strips javascript: URLs", () => {
    expect(sanitizeText("javascript:alert(1)")).toBe("alert(1)");
  });

  it("strips inline event handlers (leaves inert body text)", () => {
    expect(sanitizeText("onclick=alert(1) x")).toBe("alert(1) x");
  });

  it("truncates to maxLen", () => {
    expect(sanitizeText("1234567890", 5)).toBe("12345");
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hi  ")).toBe("hi");
  });

  it("leaves clean text untouched", () => {
    expect(sanitizeText("Hello, world!")).toBe("Hello, world!");
  });
});
