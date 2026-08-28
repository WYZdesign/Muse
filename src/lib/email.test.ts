import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("email", () => {
  let originalFetch: typeof global.fetch;
  let mockFetch: ReturnType<typeof vi.fn> = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, { RESEND_API_KEY: "re_test_key" });
    originalFetch = global.fetch;
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetAllMocks();
  });

  describe("sendEmail", () => {
    it("should return error when RESEND_API_KEY not set", async () => {
      vi.resetModules();
      delete process.env.RESEND_API_KEY;
      const { sendEmail } = await import("./email");
      const result = await sendEmail({ to: "test@test.com", subject: "Test", html: "<p>Test</p>" });
      expect(result).toEqual({ sent: false, error: "RESEND_API_KEY not configured" });
    });

    it("should send email successfully", async () => {
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('{"id": "test-id"}'),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const { sendEmail } = await import("./email");
      const result = await sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result).toEqual({ sent: true });
      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe("https://api.resend.com/emails");
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].headers.Authorization).toBe("Bearer re_test_key");
      expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
      const body = JSON.parse(callArgs[1].body);
      expect(body.from).toBe("Muse <info@wyzdesign.com>");
      expect(body.to).toEqual(["test@test.com"]);
      expect(body.subject).toBe("Test");
      expect(body.html).toBe("<p>Test</p>");
      expect(body.text).toBeUndefined();
    });

    it("should include text content when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"id": "test-id"}'),
      });

      const { sendEmail } = await import("./email");
      await sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test plain text",
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.text).toBe("Test plain text");
    });

    it("should return error when Resend returns non-ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Invalid email"),
      });

      const { sendEmail } = await import("./email");
      const result = await sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result).toEqual({ sent: false, error: "resend_400" });
    });

    it("should return error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { sendEmail } = await import("./email");
      const result = await sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result).toEqual({ sent: false, error: "send_failure" });
    });

    it("should return error when RESEND_API_KEY not configured", async () => {
      vi.resetModules();
      delete process.env.RESEND_API_KEY;
      const { sendEmail } = await import("./email");
      const result = await sendEmail({
        to: "test@test.com",
        subject: "Test",
        html: "<p>Test</p>",
      });
      expect(result).toEqual({ sent: false, error: "RESEND_API_KEY not configured" });
    });
  });

  describe("waitlistWelcome", () => {
    it("should generate welcome email with correct structure", async () => {
      const { waitlistWelcome } = await import("./email");
      const msg = waitlistWelcome("test@test.com", "web");

      expect(msg.to).toBe("test@test.com");
      expect(msg.subject).toBe("You're on the Muse waitlist ✦");
      expect(msg.html).toContain("You're on the list ✦");
      expect(msg.html).toContain("test@test.com");
      expect(msg.html).toContain("Create your account");
      expect(msg.text).toContain("Thanks for joining Muse");
    });

    it("should include source in CTA link", async () => {
      const { waitlistWelcome } = await import("./email");
      const msg = waitlistWelcome("test@test.com", "social");
      expect(msg.html).toContain("src=welcome_email");
    });
  });

  describe("betaAccess", () => {
    it("should generate beta access email", async () => {
      const { betaAccess } = await import("./email");
      const msg = betaAccess("test@test.com");

      expect(msg.to).toBe("test@test.com");
      expect(msg.subject).toBe("Your Muse access is ready ✦");
      expect(msg.html).toContain("Your Muse access is ready");
      expect(msg.html).toContain("Enter Muse");
      expect(msg.text).toContain("Your Muse access is ready");
    });
  });

  describe("signupWelcome", () => {
    it("should generate signup welcome email with name", async () => {
      const { signupWelcome } = await import("./email");
      const msg = signupWelcome("test@test.com", "John");

      expect(msg.to).toBe("test@test.com");
      expect(msg.subject).toBe("Welcome to Muse ✦");
      expect(msg.html).toContain("Welcome to Muse, John ✦");
      expect(msg.html).toContain("Finish your profile");
      expect(msg.text).toContain("Welcome to Muse!");
    });

    it("should handle missing name", async () => {
      const { signupWelcome } = await import("./email");
      const msg = signupWelcome("test@test.com", "");
      expect(msg.html).toContain("Welcome to Muse, there ✦");
    });
  });

  describe("notify", () => {
    it("should generate notification email with CTA", async () => {
      const { notify } = await import("./email");
      const msg = notify(
        "test@test.com",
        "New Match",
        "You have a new match!",
        "Someone liked your profile",
        "View Match",
        "https://muse.com/match/123",
      );

      expect(msg.to).toBe("test@test.com");
      expect(msg.subject).toBe("New Match");
      expect(msg.html).toContain("You have a new match!");
      expect(msg.html).toContain("Someone liked your profile");
      expect(msg.html).toContain("View Match");
      expect(msg.html).toContain("https://muse.com/match/123");
    });

    it("should work without CTA", async () => {
      const { notify } = await import("./email");
      const msg = notify("test@test.com", "Alert", "Title", "Body");
      // Footer always has Terms/Privacy links, but no CTA button in content area
      expect(msg.html).toContain("Title");
      expect(msg.html).toContain("Body");
    });

    it("should escape HTML in title and body", async () => {
      const { notify } = await import("./email");
      const msg = notify("test@test.com", "Alert", "<script>alert(1)</script>", "<img src=x onerror=alert(1)>");
      // Tags are escaped to prevent XSS
      expect(msg.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(msg.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    });
  });

  describe("trySend", () => {
    it("should not throw on failure", async () => {
      vi.resetModules();
      delete process.env.RESEND_API_KEY;
      const { trySend } = await import("./email");
      // trySend returns void, not a Promise - just verify it doesn't throw
      expect(() => trySend({ to: "test@test.com", subject: "Test", html: "<p>Test</p>" })).not.toThrow();
    });
  });
});