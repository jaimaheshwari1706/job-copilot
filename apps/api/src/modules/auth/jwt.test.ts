import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "./jwt.js";

describe("access token", () => {
  it("round-trips a valid payload", () => {
    const token = signAccessToken({ sub: "user123", email: "test@example.com" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user123");
    expect(payload.email).toBe("test@example.com");
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken({ sub: "user123", email: "test@example.com" });
    const tampered = token.slice(0, -2) + "xx";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it("rejects a garbage token", () => {
    expect(() => verifyAccessToken("not-a-real-token")).toThrow();
  });
});
