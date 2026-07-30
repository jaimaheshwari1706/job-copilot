import { randomBytes, createHash } from "node:crypto";
import { User, Profile, type UserDoc } from "@job-copilot/db";
import type { AuthUser } from "@job-copilot/shared";
import { ApiError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { hashPassword, verifyPassword } from "./password.js";
import { signAccessToken } from "./jwt.js";
import { createSession, rotateSession, revokeSessionByRawToken } from "./session.service.js";

async function toAuthUser(user: UserDoc): Promise<AuthUser> {
  const profile = await Profile.findOne({ userId: user._id }).select("onboardingCompletedAt");
  return {
    id: String(user._id),
    email: user.email,
    name: user.name ?? undefined,
    onboardingCompletedAt: profile?.onboardingCompletedAt
      ? profile.onboardingCompletedAt.toISOString()
      : null,
  };
}

interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

export async function registerUser(
  input: { email: string; password: string; name?: string },
  meta: RequestMeta,
) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    // Deliberately vague — don't confirm which emails are registered.
    throw ApiError.badRequest("Unable to register with these details.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({ email: input.email, passwordHash, name: input.name });

  const accessToken = signAccessToken({ sub: String(user._id), email: user.email });
  const { rawRefreshToken } = await createSession({
    userId: String(user._id),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  return { user: await toAuthUser(user), accessToken, rawRefreshToken };
}

export async function loginUser(
  input: { email: string; password: string },
  meta: RequestMeta,
) {
  const user = await User.findOne({ email: input.email });
  // Same error for "no such user" and "wrong password" — don't leak which.
  const invalidCredentials = () => ApiError.unauthorized("Invalid email or password");

  if (!user) throw invalidCredentials();

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw invalidCredentials();

  const accessToken = signAccessToken({ sub: String(user._id), email: user.email });
  const { rawRefreshToken } = await createSession({
    userId: String(user._id),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  return { user: await toAuthUser(user), accessToken, rawRefreshToken };
}

export async function refreshSession(rawRefreshToken: string, meta: RequestMeta) {
  const result = await rotateSession(rawRefreshToken, meta);

  if (result.status === "invalid") {
    throw ApiError.unauthorized("Invalid refresh token");
  }
  if (result.status === "reused_revoked_family") {
    logger.warn("Refresh token reuse detected — session family revoked");
    throw ApiError.unauthorized("Session invalidated. Please log in again.");
  }

  const user = await User.findById(result.userId);
  if (!user) throw ApiError.unauthorized("Invalid session");

  const accessToken = signAccessToken({ sub: String(user._id), email: user.email });
  return { user: await toAuthUser(user), accessToken, rawRefreshToken: result.issued.rawRefreshToken };
}

export async function logoutUser(rawRefreshToken: string | undefined) {
  if (rawRefreshToken) {
    await revokeSessionByRawToken(rawRefreshToken);
  }
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized("User not found");
  return toAuthUser(user);
}

export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized("User not found");

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest("Current password is incorrect");

  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();
}

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a password-reset token. No email provider is configured yet
 * (Phase 0 §47 — email is a later integration), so in non-production
 * environments the raw token is returned directly for local testing. In
 * production this MUST be wired to a real email send instead of ever
 * returning the token in the response.
 */
export async function requestPasswordReset(email: string): Promise<{ devToken?: string }> {
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal whether the email exists.
    return {};
  }

  const rawToken = randomBytes(RESET_TOKEN_BYTES).toString("hex");
  user.passwordResetTokenHash = hashResetToken(rawToken);
  user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  if (process.env.NODE_ENV === "production") {
    // TODO(Phase: email integration): send rawToken via email provider.
    logger.info({ userId: String(user._id) }, "Password reset requested");
    return {};
  }

  return { devToken: rawToken };
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashResetToken(rawToken);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpiresAt");

  if (!user) throw ApiError.badRequest("Reset link is invalid or has expired");

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
}
