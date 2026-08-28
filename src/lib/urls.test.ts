import { describe, it, expect, vi, beforeEach } from "vitest";

describe("urls", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_APP_URL = "https://test.muse.com";
  });

  describe("getBaseUrl", () => {
    it("should return NEXT_PUBLIC_APP_URL when set", async () => {
      const { getBaseUrl } = await import("./urls");
      expect(getBaseUrl()).toBe("https://test.muse.com");
    });

    it("should return default URL when env not set", async () => {
      vi.resetModules();
      delete process.env.NEXT_PUBLIC_APP_URL;
      const { getBaseUrl } = await import("./urls");
      expect(getBaseUrl()).toBe("https://muse.wyzdesign.com");
    });
  });

  describe("getMuseUrl", () => {
    it("should return base URL with /muse prefix", async () => {
      const { getMuseUrl } = await import("./urls");
      expect(getMuseUrl()).toBe("https://test.muse.com/muse");
    });

    it("should append path correctly", async () => {
      const { getMuseUrl } = await import("./urls");
      expect(getMuseUrl("profile/123")).toBe("https://test.muse.com/muse/profile/123");
    });

    it("should handle path with leading slash", async () => {
      const { getMuseUrl } = await import("./urls");
      expect(getMuseUrl("/profile/123")).toBe("https://test.muse.com/muse/profile/123");
    });

    it("should handle empty path", async () => {
      const { getMuseUrl } = await import("./urls");
      expect(getMuseUrl("")).toBe("https://test.muse.com/muse");
    });
  });

  describe("getLandingUrl", () => {
    it("should return base URL with /muse/landing prefix", async () => {
      const { getLandingUrl } = await import("./urls");
      expect(getLandingUrl()).toBe("https://test.muse.com/muse/landing");
    });

    it("should append path correctly", async () => {
      const { getLandingUrl } = await import("./urls");
      expect(getLandingUrl("about")).toBe("https://test.muse.com/muse/landing/about");
    });

    it("should handle path with leading slash", async () => {
      const { getLandingUrl } = await import("./urls");
      expect(getLandingUrl("/about")).toBe("https://test.muse.com/muse/landing/about");
    });
  });

  describe("getProfileUrl", () => {
    it("should return profile URL with userId", async () => {
      const { getProfileUrl } = await import("./urls");
      expect(getProfileUrl(123)).toBe("https://test.muse.com/muse/profile/123");
    });

    it("should work with string userId", async () => {
      const { getProfileUrl } = await import("./urls");
      expect(getProfileUrl("abc")).toBe("https://test.muse.com/muse/profile/abc");
    });
  });

  describe("getPostUrl", () => {
    it("should return post URL with postId", async () => {
      const { getPostUrl } = await import("./urls");
      expect(getPostUrl(456)).toBe("https://test.muse.com/muse/post/456");
    });
  });

  describe("getCommunityUrl", () => {
    it("should return community URL with communityId", async () => {
      const { getCommunityUrl } = await import("./urls");
      expect(getCommunityUrl(789)).toBe("https://test.muse.com/muse/community/789");
    });
  });

  describe("getEventUrl", () => {
    it("should return event URL with eventId", async () => {
      const { getEventUrl } = await import("./urls");
      expect(getEventUrl(101)).toBe("https://test.muse.com/muse/event/101");
    });
  });

  describe("getProUrl", () => {
    it("should return pro URL with proId", async () => {
      const { getProUrl } = await import("./urls");
      expect(getProUrl(555)).toBe("https://test.muse.com/muse/pro/555");
    });
  });

  describe("getTermsUrl", () => {
    it("should return terms URL", async () => {
      const { getTermsUrl } = await import("./urls");
      expect(getTermsUrl()).toBe("https://test.muse.com/muse/terms");
    });
  });

  describe("getPrivacyUrl", () => {
    it("should return privacy URL", async () => {
      const { getPrivacyUrl } = await import("./urls");
      expect(getPrivacyUrl()).toBe("https://test.muse.com/muse/privacy");
    });
  });

  describe("getGuidelinesUrl", () => {
    it("should return guidelines URL", async () => {
      const { getGuidelinesUrl } = await import("./urls");
      expect(getGuidelinesUrl()).toBe("https://test.muse.com/muse/guidelines");
    });
  });

  describe("getSafetyUrl", () => {
    it("should return safety URL", async () => {
      const { getSafetyUrl } = await import("./urls");
      expect(getSafetyUrl()).toBe("https://test.muse.com/muse/safety");
    });
  });

  describe("getPricingUrl", () => {
    it("should return pricing URL", async () => {
      const { getPricingUrl } = await import("./urls");
      expect(getPricingUrl()).toBe("https://test.muse.com/muse/pricing");
    });
  });

  describe("getAboutUrl", () => {
    it("should return about URL", async () => {
      const { getAboutUrl } = await import("./urls");
      expect(getAboutUrl()).toBe("https://test.muse.com/muse/about");
    });
  });

  describe("getPressUrl", () => {
    it("should return press URL", async () => {
      const { getPressUrl } = await import("./urls");
      expect(getPressUrl()).toBe("https://test.muse.com/muse/press");
    });
  });

  describe("getCareersUrl", () => {
    it("should return careers URL", async () => {
      const { getCareersUrl } = await import("./urls");
      expect(getCareersUrl()).toBe("https://test.muse.com/muse/careers");
    });
  });

  describe("getBlogUrl", () => {
    it("should return blog URL", async () => {
      const { getBlogUrl } = await import("./urls");
      expect(getBlogUrl()).toBe("https://test.muse.com/muse/blog");
    });
  });

  describe("getFaqUrl", () => {
    it("should return FAQ URL", async () => {
      const { getFaqUrl } = await import("./urls");
      expect(getFaqUrl()).toBe("https://test.muse.com/muse/faq");
    });
  });

  describe("getPressUrlAlt", () => {
    it("should return press URL (alt)", async () => {
      const { getPressUrlAlt } = await import("./urls");
      expect(getPressUrlAlt()).toBe("https://test.muse.com/muse/press");
    });
  });

  describe("getLandingShareUrl", () => {
    it("should return landing URL with source param", async () => {
      const { getLandingShareUrl } = await import("./urls");
      expect(getLandingShareUrl("email")).toBe("https://test.muse.com/muse/landing?src=email");
    });

    it("should return landing URL without source param", async () => {
      const { getLandingShareUrl } = await import("./urls");
      expect(getLandingShareUrl()).toBe("https://test.muse.com/muse/landing");
    });

    it("should handle special characters in source", async () => {
      const { getLandingShareUrl } = await import("./urls");
      expect(getLandingShareUrl("social media")).toBe("https://test.muse.com/muse/landing?src=social media");
    });
  });

  describe("getReferralUrl", () => {
    it("should return referral URL with code", async () => {
      const { getReferralUrl } = await import("./urls");
      expect(getReferralUrl("ABC123")).toBe("https://test.muse.com/muse?ref=ABC123");
    });
  });

  describe("getProfileShareUrl", () => {
    it("should return profile URL with ref", async () => {
      const { getProfileShareUrl } = await import("./urls");
      expect(getProfileShareUrl(123, "ref123")).toBe("https://test.muse.com/muse/profile/123?ref=ref123");
    });

    it("should return profile URL without ref", async () => {
      const { getProfileShareUrl } = await import("./urls");
      expect(getProfileShareUrl(123)).toBe("https://test.muse.com/muse/profile/123");
    });
  });

  describe("getPostShareUrl", () => {
    it("should return post URL", async () => {
      const { getPostShareUrl } = await import("./urls");
      expect(getPostShareUrl(789)).toBe("https://test.muse.com/muse/post/789");
    });
  });

  describe("getCommunityShareUrl", () => {
    it("should return community URL", async () => {
      const { getCommunityShareUrl } = await import("./urls");
      expect(getCommunityShareUrl(111)).toBe("https://test.muse.com/muse/community/111");
    });
  });

  describe("getEventShareUrl", () => {
    it("should return event URL", async () => {
      const { getEventShareUrl } = await import("./urls");
      expect(getEventShareUrl(222)).toBe("https://test.muse.com/muse/event/222");
    });
  });

  describe("getProShareUrl", () => {
    it("should return pro URL", async () => {
      const { getProShareUrl } = await import("./urls");
      expect(getProShareUrl(333)).toBe("https://test.muse.com/muse/pro/333");
    });
  });

  describe("getProShareUrlWithRef", () => {
    it("should return pro URL with ref param", async () => {
      const { getProShareUrlWithRef } = await import("./urls");
      expect(getProShareUrlWithRef(333, "ref456")).toBe("https://test.muse.com/muse/pro/333?ref=ref456");
    });
  });

  describe("edge cases", () => {
    it("should handle trailing slashes in path", async () => {
      const { getMuseUrl } = await import("./urls");
      // Path with trailing slash should still work
      expect(getMuseUrl("profile/123/")).toBe("https://test.muse.com/muse/profile/123/");
    });

    it("should handle multiple leading slashes", async () => {
      const { getMuseUrl } = await import("./urls");
      expect(getMuseUrl("//profile/123")).toBe("https://test.muse.com/muse//profile/123");
    });
  });
});