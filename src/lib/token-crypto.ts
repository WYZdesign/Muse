import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_RAW = process.env.OAUTH_TOKEN_KEY || process.env.OAUTH_STATE_SECRET || process.env.STRIPE_SECRET_KEY || "";

function getKey(): Buffer {
  // Derive a 32-byte key from whatever secret is available
  return crypto.createHash("sha256").update(KEY_RAW).digest();
}

/** Encrypt a string token. Returns base64:iv:authTag:ciphertext */
export function encryptToken(plaintext: string): string {
  if (!KEY_RAW) return plaintext; // No key configured — store plaintext (dev)
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/** Decrypt an encrypted token. Returns original string. */
export function decryptToken(ciphertext: string): string {
  if (!ciphertext.startsWith("enc:")) return ciphertext; // Not encrypted (legacy or dev)
  if (!KEY_RAW) return ciphertext.replace(/^enc:/, ""); // No key — strip prefix
  const [, ivB64, tagB64, dataB64] = ciphertext.split(":");
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
