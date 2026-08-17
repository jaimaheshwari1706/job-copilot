import type { Response } from "express";
import { env } from "../../config/env.js";

export const REFRESH_COOKIE_NAME = "refresh_token";

// "lax" is fine (and simplest) when API and web share a site, e.g. both on
// localhost in dev. But frontend and API are commonly deployed on entirely
// different registrable domains (Cloudflare Pages + Render, in our case) —
// a genuinely cross-site request. "Lax" cookies are withheld from cross-site
// fetch()/XHR (only sent on top-level navigations), so the browser silently
// drops this cookie on every /auth/refresh call, even though it stored it
// fine at login. "None" is required for cross-site use, and browsers reject
// "None" without "Secure" — COOKIE_SECURE is already forced true in
// production (see env.ts), so it's a reliable signal for which case we're in.
const REFRESH_COOKIE_SAME_SITE = env.COOKIE_SECURE ? "none" : "lax";

export function setRefreshCookie(res: Response, rawRefreshToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: REFRESH_COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    path: "/auth", // scoped to auth endpoints only — never sent on unrelated API calls
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: REFRESH_COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    path: "/auth",
  });
}
