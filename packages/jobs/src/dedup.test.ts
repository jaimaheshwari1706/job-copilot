import { describe, expect, it } from "vitest";
import { normalizeTitle } from "./normalization.js";
import { scoreDuplicateConfidence, dedupeFingerprint, DUPLICATE_CONFIDENCE_THRESHOLD } from "./dedup.js";

describe("normalizeTitle", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeTitle("Sr. Software Engineer!")).toBe("senior software engineer");
  });

  it("treats equivalent abbreviations the same", () => {
    expect(normalizeTitle("Sr Software Engineer")).toBe(normalizeTitle("Senior Software Engineer"));
  });

  it("does not collapse genuinely different titles", () => {
    expect(normalizeTitle("Frontend Engineer")).not.toBe(normalizeTitle("Backend Engineer"));
  });
});

describe("scoreDuplicateConfidence", () => {
  const base = {
    title: "Full Stack Developer",
    company: "Northwind Labs",
    location: "Bangalore, India",
    applyUrl: "https://example.com/apply/1",
    postedAt: new Date("2026-01-10"),
  };

  it("scores an identical listing as a near-certain duplicate", () => {
    const result = scoreDuplicateConfidence(base, { ...base });
    expect(result.confidence).toBeGreaterThanOrEqual(DUPLICATE_CONFIDENCE_THRESHOLD);
  });

  it("scores a different company as NOT a duplicate even with the same title", () => {
    const result = scoreDuplicateConfidence(base, { ...base, company: "Some Other Company" });
    expect(result.confidence).toBeLessThan(DUPLICATE_CONFIDENCE_THRESHOLD);
  });

  it("scores a legitimate repost (same company/title, very different apply URL, distant date) below the threshold when title/company alone aren't enough", () => {
    // Same company + same title alone = 0.65, below the 0.75 threshold —
    // by design, title+company matching isn't sufficient on its own to
    // silently merge two potentially-distinct listings.
    const result = scoreDuplicateConfidence(base, {
      ...base,
      applyUrl: "https://example.com/apply/999",
      location: "Different City",
      postedAt: new Date("2026-03-01"),
    });
    expect(result.confidence).toBeLessThan(DUPLICATE_CONFIDENCE_THRESHOLD);
  });

  it("does not falsely flag two different roles at the same company as duplicates", () => {
    const result = scoreDuplicateConfidence(base, {
      ...base,
      title: "Senior Backend Engineer",
      applyUrl: "https://example.com/apply/2",
    });
    expect(result.confidence).toBeLessThan(DUPLICATE_CONFIDENCE_THRESHOLD);
  });

  it("returns structured, inspectable signals rather than an opaque score", () => {
    const result = scoreDuplicateConfidence(base, { ...base });
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals.every((s) => "factor" in s && "matched" in s && "weight" in s)).toBe(true);
  });
});

describe("dedupeFingerprint", () => {
  it("produces the same fingerprint for equivalent title/company/location", () => {
    const a = dedupeFingerprint({ title: "Sr. Engineer", company: "Acme", location: "NYC" });
    const b = dedupeFingerprint({ title: "Senior Engineer", company: "Acme", location: "NYC" });
    expect(a).toBe(b);
  });

  it("produces a different fingerprint for a different company", () => {
    const a = dedupeFingerprint({ title: "Engineer", company: "Acme", location: "NYC" });
    const b = dedupeFingerprint({ title: "Engineer", company: "Globex", location: "NYC" });
    expect(a).not.toBe(b);
  });
});
