import { randomBytes, randomUUID, createHash } from "node:crypto";
import { Session, type SessionDoc } from "@job-copilot/db";
import { env } from "../../config/env.js";

const REFRESH_TOKEN_BYTES = 48;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function refreshExpiryDate(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Coarse, non-reversible-in-practice signal for "new device" UX later — never store raw IP. */
function hashIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export interface CreateSessionInput {
  userId: string;
  userAgent?: string;
  ip?: string;
  familyId?: string; // present when rotating an existing chain
}

export interface IssuedSession {
  rawRefreshToken: string;
  session: SessionDoc;
}

/**
 * Creates a brand-new session (new login) or the next link in an existing
 * rotation chain (same familyId, passed in by rotateSession).
 */
export async function createSession({
  userId,
  userAgent,
  ip,
  familyId,
}: CreateSessionInput): Promise<IssuedSession> {
  const rawRefreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");

  const session = await Session.create({
    userId,
    refreshTokenHash: hashToken(rawRefreshToken),
    familyId: familyId ?? randomUUID(),
    userAgent,
    ipHash: hashIp(ip),
    expiresAt: refreshExpiryDate(),
  });

  return { rawRefreshToken, session };
}

export type RotateResult =
  | { status: "rotated"; issued: IssuedSession; userId: string }
  | { status: "invalid" }
  | { status: "reused_revoked_family" };

/**
 * Validates a presented refresh token and rotates it.
 *
 * Reuse detection: if the token hashes to a session that has ALREADY been
 * rotated (replacedBySessionId is set) or is revoked, that's a strong signal
 * the token was stolen and replayed — we revoke the entire family so every
 * device on that login chain is logged out, rather than silently accepting it.
 */
export async function rotateSession(
  rawRefreshToken: string,
  meta: { userAgent?: string; ip?: string },
): Promise<RotateResult> {
  const tokenHash = hashToken(rawRefreshToken);
  const session = await Session.findOne({ refreshTokenHash: tokenHash });

  if (!session) return { status: "invalid" };

  if (session.revokedAt || session.replacedBySessionId || session.expiresAt < new Date()) {
    await Session.updateMany(
      { familyId: session.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    return { status: "reused_revoked_family" };
  }

  const issued = await createSession({
    userId: String(session.userId),
    userAgent: meta.userAgent,
    ip: meta.ip,
    familyId: session.familyId,
  });

  session.revokedAt = new Date();
  session.replacedBySessionId = issued.session._id;
  session.lastUsedAt = new Date();
  await session.save();

  return { status: "rotated", issued, userId: String(session.userId) };
}

export async function revokeSessionByRawToken(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await Session.updateOne({ refreshTokenHash: tokenHash }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await Session.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
