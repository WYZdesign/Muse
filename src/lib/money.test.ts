import { describe, it, expect } from "vitest";
import { parseRateToCents, centsToDollars } from "./money";

describe("parseRateToCents", () => {
  it("parses plain dollar amounts", () => {
    expect(parseRateToCents("200")).toBe(20000);
    expect(parseRateToCents("$200")).toBe(20000);
    expect(parseRateToCents("150")).toBe(15000);
  });

  it("parses decimal amounts", () => {
    expect(parseRateToCents("$9.99")).toBe(999);
    expect(parseRateToCents("150.00")).toBe(15000);
  });

  it("parses thousands separators", () => {
    expect(parseRateToCents("$1,200.50")).toBe(120050);
  });

  it("returns null for empty or non-numeric", () => {
    expect(parseRateToCents("")).toBe(null);
    expect(parseRateToCents(null)).toBe(null);
    expect(parseRateToCents("Free")).toBe(null);
    expect(parseRateToCents("TFP")).toBe(null);
  });

  it("returns null for ambiguous multi-number rates", () => {
    expect(parseRateToCents("$50-100/hr")).toBe(null);
    expect(parseRateToCents("2 hour shoot, $150")).toBe(null);
  });

  it("rejects zero and absurd values", () => {
    expect(parseRateToCents("0")).toBe(null);
    expect(parseRateToCents("$5,000,000")).toBe(null);
  });
});

describe("centsToDollars", () => {
  it("formats cents to dollars", () => {
    expect(centsToDollars(15000)).toBe("$150.00");
    expect(centsToDollars(999)).toBe("$9.99");
  });
});
