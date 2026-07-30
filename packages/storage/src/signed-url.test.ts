import { describe, expect, it, vi } from "vitest";
import { createSignedDownloadToken, verifySignedDownloadToken } from "./signed-url.js";

const SECRET = "test-secret-key-that-is-long-enough";

describe("signed download tokens", () => {
  it("round-trips a valid token", () => {
    const { token } = createSignedDownloadToken("resumes/user1/abc.pdf", SECRET, 60);
    const result = verifySignedDownloadToken(token, SECRET);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.storageKey).toBe("resumes/user1/abc.pdf");
  });

  it("rejects a token signed with a different secret", () => {
    const { token } = createSignedDownloadToken("resumes/user1/abc.pdf", SECRET, 60);
    const result = verifySignedDownloadToken(token, "wrong-secret");
    expect(result.valid).toBe(false);
  });

  it("rejects a tampered storage key", () => {
    const { token } = createSignedDownloadToken("resumes/user1/abc.pdf", SECRET, 60);
    const [, expiresAt, signature] = token.split(".");
    const tamperedKey = Buffer.from("resumes/user2/abc.pdf").toString("base64url");
    const tampered = `${tamperedKey}.${expiresAt}.${signature}`;
    const result = verifySignedDownloadToken(tampered, SECRET);
    expect(result.valid).toBe(false);
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { token } = createSignedDownloadToken("resumes/user1/abc.pdf", SECRET, 60);
    vi.setSystemTime(new Date("2026-01-01T00:02:00Z")); // 2 minutes later, past the 60s TTL
    const result = verifySignedDownloadToken(token, SECRET);
    expect(result.valid).toBe(false);
    vi.useRealTimers();
  });

  it("rejects a malformed token", () => {
    expect(verifySignedDownloadToken("not-a-real-token", SECRET).valid).toBe(false);
  });
});
