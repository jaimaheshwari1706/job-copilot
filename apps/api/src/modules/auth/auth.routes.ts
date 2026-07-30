import { Router } from "express";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type ApiSuccess,
  type LoginResponse,
  type AuthUser,
} from "@job-copilot/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { authRateLimiter } from "../../middleware/auth-rate-limit.js";
import { REFRESH_COOKIE_NAME, setRefreshCookie, clearRefreshCookie } from "./cookies.js";
import * as authService from "./auth.service.js";

export const authRouter = Router();

function requestMeta(req: { headers: Record<string, unknown>; ip?: string }) {
  return {
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
    ip: req.ip,
  };
}

authRouter.post(
  "/register",
  authRateLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { user, accessToken, rawRefreshToken } = await authService.registerUser(
      req.body,
      requestMeta(req),
    );
    setRefreshCookie(res, rawRefreshToken);
    const body: ApiSuccess<LoginResponse> = { success: true, data: { user, accessToken } };
    res.status(201).json(body);
  }),
);

authRouter.post(
  "/login",
  authRateLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { user, accessToken, rawRefreshToken } = await authService.loginUser(
      req.body,
      requestMeta(req),
    );
    setRefreshCookie(res, rawRefreshToken);
    const body: ApiSuccess<LoginResponse> = { success: true, data: { user, accessToken } };
    res.json(body);
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawRefreshToken) {
      clearRefreshCookie(res);
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "No refresh token" },
      });
      return;
    }

    try {
      const { user, accessToken, rawRefreshToken: nextToken } = await authService.refreshSession(
        rawRefreshToken,
        requestMeta(req),
      );
      setRefreshCookie(res, nextToken);
      const body: ApiSuccess<LoginResponse> = { success: true, data: { user, accessToken } };
      res.json(body);
    } catch (err) {
      clearRefreshCookie(res);
      throw err;
    }
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logoutUser(rawRefreshToken);
    clearRefreshCookie(res);
    const body: ApiSuccess<{ loggedOut: true }> = { success: true, data: { loggedOut: true } };
    res.json(body);
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user!.id);
    const body: ApiSuccess<AuthUser> = { success: true, data: user };
    res.json(body);
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!.id, req.body);
    const body: ApiSuccess<{ changed: true }> = { success: true, data: { changed: true } };
    res.json(body);
  }),
);

authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { devToken } = await authService.requestPasswordReset(req.body.email);
    const body: ApiSuccess<{ sent: true; devToken?: string }> = {
      success: true,
      data: { sent: true, ...(devToken ? { devToken } : {}) },
      message: devToken
        ? "No email provider is configured yet — dev-only reset token returned directly."
        : "If that email is registered, a reset link has been sent.",
    };
    res.json(body);
  }),
);

authRouter.post(
  "/reset-password",
  authRateLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);
    const body: ApiSuccess<{ reset: true }> = { success: true, data: { reset: true } };
    res.json(body);
  }),
);
