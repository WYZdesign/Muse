// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { applyImgFallback } from "./img-fallback";

describe("applyImgFallback", () => {
  it("swaps a broken <img>'s src for a real, visible initials avatar", () => {
    const img = document.createElement("img");
    img.alt = "Maya Chen";
    img.setAttribute("src", "https://cdn.example.com/broken.jpg");

    applyImgFallback(img);

    // The fix this exists for: <img> is a replaced element, so painting a
    // glyph via style + textContent (the old approach) never rendered
    // anything visible. Swapping src to a real data:image/svg+xml avatar
    // is the only one of the two that actually shows an initial.
    expect(img.src).toMatch(/^data:image\/svg\+xml;utf8,/);
    expect(decodeURIComponent(img.src)).toContain(">MC</text>");
    expect(img.alt).toBe("Maya Chen");
  });

  it("is idempotent via dataset.fallback — a second call is a no-op", () => {
    const img = document.createElement("img");
    img.alt = "Maya Chen";
    applyImgFallback(img);
    const firstSrc = img.src;

    img.alt = "Someone Else"; // simulate a later, unrelated mutation
    applyImgFallback(img);

    expect(img.src).toBe(firstSrc);
  });

  it("clears srcset so the browser can't keep showing the broken source", () => {
    const img = document.createElement("img");
    img.alt = "Jordan Lee";
    img.setAttribute("srcset", "https://cdn.example.com/broken-2x.jpg 2x");

    applyImgFallback(img);

    expect(img.getAttribute("srcset")).toBeNull();
  });

  it("falls back to a generic name when alt is empty", () => {
    const img = document.createElement("img");

    applyImgFallback(img);

    expect(img.alt).toBe("Creative");
    expect(decodeURIComponent(img.src)).toContain(">C</text>");
  });

  it("produces different avatars for two different broken photos with no alt text in common", () => {
    const imgA = document.createElement("img");
    imgA.alt = "Profile";
    imgA.setAttribute("src", "https://cdn.example.com/a.jpg");
    const imgB = document.createElement("img");
    imgB.alt = "Profile";
    imgB.setAttribute("src", "https://cdn.example.com/b.jpg");

    applyImgFallback(imgA);
    applyImgFallback(imgB);

    expect(imgA.src).not.toBe(imgB.src);
  });
});
