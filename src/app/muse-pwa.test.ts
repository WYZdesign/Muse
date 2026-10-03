import { describe, it, expect } from "vitest";
import { urlBase64ToUint8Array } from "./muse-pwa";

describe("urlBase64ToUint8Array (push subscription key decode)", () => {
  it("decodes a standard base64 string to its bytes", () => {
    // "AQAB" is the standard base64 of the bytes [1, 0, 1]
    expect(Array.from(urlBase64ToUint8Array("AQAB"))).toEqual([1, 0, 1]);
  });

  it("accepts URL-safe alphabet (- and _)", () => {
    // bytes [251, 255] -> standard base64 "+/8=" -> url-safe "-_8"
    expect(Array.from(urlBase64ToUint8Array("-_8"))).toEqual([251, 255]);
  });

  it("handles missing padding", () => {
    expect(Array.from(urlBase64ToUint8Array("AQ"))).toEqual([1]);
    expect(Array.from(urlBase64ToUint8Array("AQAB"))).toEqual([1, 0, 1]);
  });

  it("returns an empty array for an empty string", () => {
    expect(Array.from(urlBase64ToUint8Array(""))).toEqual([]);
  });
});
