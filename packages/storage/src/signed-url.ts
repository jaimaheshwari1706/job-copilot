import { createHmac, timingSafeEqual } from "node:crypto";

interface SignedTokenPayload {
  storageKey: string;
  expiresAt: number; // epoch ms
}

function sign(payload: SignedTokenPayload, secret: string): string {
  const data = `${payload.storageKey}:${payload.expiresAt}`;
  return createHmac("sha256", secret).update(data).digest("hex");
}

/** Generates a signed, time-limited download token for a given storage key. */
export function createSignedDownloadToken(
  storageKey: string,
  secret: string,
  ttlSeconds: number,
): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const signature = sign({ storageKey, expiresAt }, secret);
  // token = base64(storageKey).expiresAt.signature — self-contained, no server-side lookup needed
  const encodedKey = Buffer.from(storageKey).toString("base64url");
  return { token: `${encodedKey}.${expiresAt}.${signature}`, expiresAt };
}

export type VerifyResult = { valid: true; storageKey: string } | { valid: false; reason: string };

export function verifySignedDownloadToken(token: string, secret: string): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, reason: "Malformed token" };

  const [encodedKey, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!encodedKey || !signature || Number.isNaN(expiresAt)) {
    return { valid: false, reason: "Malformed token" };
  }

  let storageKey: string;
  try {
    storageKey = Buffer.from(encodedKey, "base64url").toString("utf8");
  } catch {
    return { valid: false, reason: "Malformed token" };
  }

  if (Date.now() > expiresAt) return { valid: false, reason: "Token expired" };

  const expectedSignature = sign({ storageKey, expiresAt }, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "Invalid signature" };
  }

  return { valid: true, storageKey };
}
