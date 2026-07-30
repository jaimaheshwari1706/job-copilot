import { createHash } from "node:crypto";
import { normalizeTitle } from "./normalization.js";
import type { NormalizedJob } from "./provider.interface.js";

/**
 * A coarse, NON-unique fingerprint used only to narrow down candidate
 * matches before running duplicateConfidence — never enforced as a unique
 * DB constraint, since legitimate reposts and similar roles at the same
 * company would otherwise collide.
 */
export function dedupeFingerprint(job: Pick<NormalizedJob, "title" | "company" | "location">): string {
  const key = `${normalizeTitle(job.title)}|${job.company.toLowerCase().trim()}|${(job.location ?? "").toLowerCase().trim()}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export interface DuplicateSignal {
  factor: string;
  matched: boolean;
  weight: number;
}

export interface DuplicateConfidenceResult {
  confidence: number; // 0..1
  signals: DuplicateSignal[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Explainable, deterministic duplicate scoring — not a black-box similarity
 * model. Each signal is independently inspectable, matching the same
 * "structured evidence over opaque scores" principle the matching engine
 * will use in Phase 6.
 */
export function scoreDuplicateConfidence(
  a: Pick<NormalizedJob, "title" | "company" | "location" | "applyUrl" | "postedAt">,
  b: Pick<NormalizedJob, "title" | "company" | "location" | "applyUrl" | "postedAt">,
): DuplicateConfidenceResult {
  const signals: DuplicateSignal[] = [];

  const sameCompany = a.company.trim().toLowerCase() === b.company.trim().toLowerCase();
  signals.push({ factor: "company", matched: sameCompany, weight: 0.35 });

  const sameTitle = normalizeTitle(a.title) === normalizeTitle(b.title);
  signals.push({ factor: "normalizedTitle", matched: sameTitle, weight: 0.3 });

  const sameLocation = (a.location ?? "").toLowerCase().trim() === (b.location ?? "").toLowerCase().trim();
  signals.push({ factor: "location", matched: sameLocation, weight: 0.15 });

  const sameApplyUrl = a.applyUrl.trim() === b.applyUrl.trim();
  signals.push({ factor: "applyUrl", matched: sameApplyUrl, weight: 0.15 });

  let postedNear = false;
  if (a.postedAt && b.postedAt) {
    postedNear = Math.abs(a.postedAt.getTime() - b.postedAt.getTime()) <= 3 * DAY_MS;
  }
  signals.push({ factor: "postedWithin3Days", matched: postedNear, weight: 0.05 });

  const confidence = signals.reduce((sum, s) => sum + (s.matched ? s.weight : 0), 0);

  return { confidence: Math.min(1, confidence), signals };
}

/** Two listings are treated as the same canonical job above this threshold. */
export const DUPLICATE_CONFIDENCE_THRESHOLD = 0.75;
