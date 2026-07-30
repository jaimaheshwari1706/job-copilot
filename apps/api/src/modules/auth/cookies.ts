import type { Response } from "express";
import { env } from "../../config/env.js";

export const REFRESH_COOKIE_NAME = "refresh_token";

export function setRefreshCookie(res: Response, rawRefreshToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax", // "lax" (not "strict") so the cookie survives a top-level nav from an external link into the app
    domain: env.COOKIE_DOMAIN,
    path: "/auth", // scoped to auth endpoints only — never sent on unrelated API calls
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    domain: env.COOKIE_DOMAIN,
    path: "/auth",
  });
}
