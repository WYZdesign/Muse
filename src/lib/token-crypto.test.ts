import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = ["OAUTH_TOKEN_KEY", "OAUTH_STATE_SECRET", "STRIPE_SECRET_KEY"] as const;

async function importWith(key: string | undefined) {
  vi.resetModules();
  for (const k of ENV_KEYS) vi.stubEnv(k, key ?? "");
  return await import("@/lib/token-crypto");
}

describe("token-crypto", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("round-trips a token when a key is configured", async () => {
    const { encryptToken, decryptToken } = await importWith("unit-test-key");
    const ciphertext = encryptToken("hello world");
    expect(ciphertext.startsWith("enc:")).toBe(true);
    expect(ciphertext).not.toContain("hello world");
    expect(decryptToken(ciphertext)).toBe("hello world");
  });

  it("stores plaintext and strips the enc: prefix when no key is configured", async () => {
    const { encryptToken, decryptToken } = await importWith(undefined);
    expect(encryptToken("plain-text")).toBe("plain-text");
    expect(decryptToken("enc:legacy")).toBe("legacy");
  });

  it("returns already-plaintext values unchanged", async () => {
    const { decryptToken } = await importWith("unit-test-key");
    expect(decryptToken("not-encrypted")).toBe("not-encrypted");
  });
});
