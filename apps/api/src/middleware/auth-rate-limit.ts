import rateLimit from "express-rate-limit";
import { ApiError } from "../lib/errors.js";

/** Tight limiter for login/register/forgot-password — the routes most worth protecting from brute force. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new ApiError(429, "RATE_LIMITED", "Too many attempts. Please try again later."));
  },
});
