import { describe, expect, it } from "vitest";
import { runMatchPipeline } from "./match.pipeline.js";
import type { CandidateMatchInput, JobMatchInput } from "./types.js";

function candidate(overrides: Partial<CandidateMatchInput> = {}): CandidateMatchInput {
  return {
    skills: [],
    targetRoles: [],
    preferredLocations: [],
    projects: [],
    education: [],
    ...overrides,
  };
}

function job(overrides: Partial<JobMatchInput> = {}): JobMatchInput {
  return {
    title: "Full Stack Developer",
    normalizedTitle: "full stack developer",
    requiredSkills: [],
    preferredSkills: [],
    requirements: [],
    ...overrides,
  };
}

describe("matching pipeline — determinism", () => {
  it("produces identical output for identical input, called twice", () => {
    const c = candidate({ skills: ["React", "Node.js"], experienceYears: 3 });
    const j = job({ requiredSkills: ["React", "Node.js"], experienceMin: 2, experienceMax: 5 });
    expect(runMatchPipeline(c, j)).toEqual(runMatchPipeline(c, j));
  });
});

describe("matching pipeline — exact skills match", () => {
  it("scores near-perfect when all required and preferred skills are present", () => {
    const result = runMatchPipeline(
      candidate({ skills: ["React", "Node.js", "TypeScript", "MongoDB"], experienceYears: 2 }),
      job({
        requiredSkills: ["React", "Node.js", "TypeScript"],
        preferredSkills: ["MongoDB"],
        experienceMin: 1,
        experienceMax: 3,
      }),
    );
    expect(result.breakdown.skills).toBe(100);
    expect(result.missingRequiredSkills).toEqual([]);
    expect(result.matchedSkills).toEqual(expect.arrayContaining(["React", "Node.js", "TypeScript", "MongoDB"]));
  });
});

describe("matching pipeline — missing required skill", () => {
  it("scores lower and lists the missing required skill explicitly", () => {
    const result = runMatchPipeline(
      candidate({ skills: ["React"] }),
      job({ requiredSkills: ["React", "Node.js", "TypeScript"] }),
    );
    expect(result.missingRequiredSkills).toEqual(["Node.js", "TypeScript"]);
    expect(result.breakdown.skills).toBeLessThan(100);
  });

  it("applies the zero-required-skills-matched constraint penalty when nothing matches", () => {
    const result = runMatchPipeline(
      candidate({ skills: ["Python", "Django"] }),
      job({ requiredSkills: ["React", "Node.js"] }),
    );
    expect(result.penalties.some((p) => p.reason.includes("No required skills matched"))).toBe(true);
  });
});

describe("matching pipeline — related but not identical skill", () => {
  it("does NOT treat JavaScript as satisfying a TypeScript requirement", () => {
    const result = runMatchPipeline(
      candidate({ skills: ["JavaScript"] }),
      job({ requiredSkills: ["TypeScript"] }),
    );
    expect(result.missingRequiredSkills).toContain("TypeScript");
    expect(result.matchedSkills).not.toContain("TypeScript");
  });
});

describe("matching pipeline — underqualified experience", () => {
  it("applies a severe penalty for a large experience gap (8 required vs 1 actual)", () => {
    const result = runMatchPipeline(
      candidate({ skills: ["React", "Node.js"], experienceYears: 1 }),
      job({ requiredSkills: ["React", "Node.js"], experienceMin: 8 }),
    );
    const penalty = result.penalties.find((p) => p.reason.includes("requires"));
    expect(penalty).toBeDefined();
    expect(result.breakdown.experience).toBeLessThan(50);
  });

  it("a strong skills match cannot mask a severe experience gap", () => {
    // Regression guard for Phase 0 §12: weighted averaging must not hide
    // an 8-years-required-vs-1-year-actual mismatch behind perfect skills.
    const result = runMatchPipeline(
      candidate({ skills: ["React", "Node.js", "TypeScript"], experienceYears: 1 }),
      job({
        requiredSkills: ["React", "Node.js", "TypeScript"],
        experienceMin: 8,
      }),
    );
    expect(result.overallScore).toBeLessThan(91);
  });

  it("a small gap (1 year) applies a smaller penalty than a large gap (7 years)", () => {
    const smallGap = runMatchPipeline(
      candidate({ experienceYears: 2 }),
      job({ experienceMin: 3 }),
    );
    const largeGap = runMatchPipeline(
      candidate({ experienceYears: 1 }),
      job({ experienceMin: 8 }),
    );
    const smallGapPenalty = smallGap.penalties.reduce((s, p) => s + p.amount, 0);
    const largeGapPenalty = largeGap.penalties.reduce((s, p) => s + p.amount, 0);
    expect(largeGapPenalty).toBeGreaterThan(smallGapPenalty);
  });
});

describe("matching pipeline — overqualified experience", () => {
  it("scores overqualification favorably but not perfectly, no penalty applied", () => {
    const result = runMatchPipeline(
      candidate({ experienceYears: 15 }),
      job({ experienceMin: 1, experienceMax: 3 }),
    );
    expect(result.breakdown.experience).toBeGreaterThanOrEqual(50);
    expect(result.penalties.some((p) => p.reason.includes("requires"))).toBe(false);
  });
});

describe("matching pipeline — remote preference mismatch", () => {
  it("scores a direct remote-vs-onsite conflict as missing", () => {
    const result = runMatchPipeline(
      candidate({ workMode: "remote" }),
      job({ workMode: "onsite" }),
    );
    expect(result.breakdown.preferences).toBeLessThan(60);
  });

  it("scores an exact work-mode match perfectly", () => {
    const result = runMatchPipeline(candidate({ workMode: "remote" }), job({ workMode: "remote" }));
    expect(result.breakdown.preferences).toBe(100);
  });
});

describe("matching pipeline — location mismatch", () => {
  it("scores a location mismatch as missing when candidate has explicit preferences", () => {
    const result = runMatchPipeline(
      candidate({ preferredLocations: ["Bangalore"] }),
      job({ location: "New York, NY" }),
    );
    const locationEvidence = result.evidence.find((e) => e.requirement.startsWith("Location"));
    expect(locationEvidence?.status).toBe("missing");
  });

  it("scores a location match as matched", () => {
    const result = runMatchPipeline(
      candidate({ preferredLocations: ["Bangalore", "Remote"] }),
      job({ location: "Bangalore, India" }),
    );
    const locationEvidence = result.evidence.find((e) => e.requirement.startsWith("Location"));
    expect(locationEvidence?.status).toBe("matched");
  });
});

describe("matching pipeline — empty/low-information job description", () => {
  it("returns low confidence when the job has no requiredSkills, experience range, or location", () => {
    const result = runMatchPipeline(
      candidate({ skills: ["React"], experienceYears: 3, targetRoles: ["Full Stack Developer"] }),
      job({ requiredSkills: [], preferredSkills: [], requirements: [] }),
    );
    expect(result.confidence).toBeLessThan(0.7);
  });

  it("never claims full confidence, since semantic scoring is not yet available", () => {
    const result = runMatchPipeline(
      candidate({
        skills: ["React", "Node.js"],
        experienceYears: 3,
        currentRole: "Full Stack Developer",
        targetRoles: ["Full Stack Developer"],
        workMode: "remote",
        preferredLocations: ["Remote"],
        expectedSalaryMin: 100000,
        expectedSalaryMax: 150000,
        projects: [{ name: "Side project", tech: ["React"] }],
        education: [{ degree: "BS", field: "CS" }],
      }),
      job({
        requiredSkills: ["React", "Node.js"],
        experienceMin: 1,
        experienceMax: 5,
        workMode: "remote",
        location: "Remote",
        salaryMin: 90000,
        salaryMax: 140000,
        requirements: ["Bachelor's degree preferred"],
      }),
    );
    expect(result.confidence).toBeLessThan(1);
  });
});

describe("matching pipeline — sparse candidate profile", () => {
  it("treats missing candidate data as no-evidence rather than a failing score", () => {
    const result = runMatchPipeline(candidate(), job({ requiredSkills: ["React"], experienceMin: 2 }));
    // No skills, no experience — should read as low-confidence, not a
    // confidently-wrong 0.
    expect(result.confidence).toBeLessThan(0.6);
  });
});

describe("matching pipeline — overall score bounds", () => {
  it("never produces a score outside 0..100 even with maximal penalties", () => {
    const result = runMatchPipeline(
      candidate({ skills: [], experienceYears: 0 }),
      job({ requiredSkills: ["React", "Node.js", "TypeScript"], experienceMin: 15 }),
    );
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });
});
