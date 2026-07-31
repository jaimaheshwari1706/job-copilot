import { describe, expect, it } from "vitest";
import { computeSkillGapAnalysis, type JobSkillProfile } from "./skill-gap-analysis.js";

function job(requiredSkills: string[], preferredSkills: string[] = []): JobSkillProfile {
  return { requiredSkills, preferredSkills };
}

describe("computeSkillGapAnalysis — demand percentages", () => {
  it("calculates exact demand percentages from job counts, not estimates", () => {
    const jobs = [
      job(["React"]),
      job(["React"]),
      job(["React", "Node.js"]),
      job(["Python"]),
    ];
    const result = computeSkillGapAnalysis([], jobs);

    const react = result.skillDemand.find((s) => s.skill === "React")!;
    expect(react.demandCount).toBe(3);
    expect(react.demandPercentage).toBe(75); // 3/4 jobs

    const python = result.skillDemand.find((s) => s.skill === "Python")!;
    expect(python.demandCount).toBe(1);
    expect(python.demandPercentage).toBe(25); // 1/4 jobs
  });

  it("returns 0% demand for all skills when there are no relevant jobs", () => {
    const result = computeSkillGapAnalysis(["React"], []);
    expect(result.totalRelevantJobs).toBe(0);
    expect(result.skillDemand).toEqual([]);
  });

  it("counts required and preferred skills together for overall demand, but tracks isRequired separately", () => {
    const jobs = [job(["React"], ["TypeScript"]), job([], ["TypeScript"])];
    const result = computeSkillGapAnalysis([], jobs);

    const typescript = result.skillDemand.find((s) => s.skill === "TypeScript")!;
    expect(typescript.demandCount).toBe(2);
    expect(typescript.isRequired).toBe(false); // never appears as required in any job

    const react = result.skillDemand.find((s) => s.skill === "React")!;
    expect(react.isRequired).toBe(true);
  });

  it("sorts skillDemand by demand percentage descending", () => {
    const jobs = [job(["Rare"]), job(["Common"]), job(["Common"]), job(["Common"])];
    const result = computeSkillGapAnalysis([], jobs);
    expect(result.skillDemand[0]!.skill).toBe("Common");
  });
});

describe("computeSkillGapAnalysis — possessed vs missing", () => {
  it("marks candidate skills as possessed", () => {
    const jobs = [job(["React", "Node.js"])];
    const result = computeSkillGapAnalysis(["React"], jobs);

    const react = result.skillDemand.find((s) => s.skill === "React")!;
    expect(react.possessed).toBe(true);
    const node = result.skillDemand.find((s) => s.skill === "Node.js")!;
    expect(node.possessed).toBe(false);
  });

  it("is case-insensitive when matching candidate skills against demand", () => {
    const jobs = [job(["React"])];
    const result = computeSkillGapAnalysis(["react"], jobs);
    expect(result.skillDemand[0]!.possessed).toBe(true);
  });

  it("lists existingSkills as only the candidate's skills that actually show up in demand", () => {
    const jobs = [job(["React"])];
    const result = computeSkillGapAnalysis(["React", "Cobol"], jobs);
    expect(result.existingSkills).toEqual(["React"]);
    expect(result.existingSkills).not.toContain("Cobol");
  });

  it("excludes possessed skills from topMissingSkills", () => {
    const jobs = [job(["React", "Node.js"])];
    const result = computeSkillGapAnalysis(["React"], jobs);
    expect(result.topMissingSkills.map((s) => s.skill)).not.toContain("React");
    expect(result.topMissingSkills.map((s) => s.skill)).toContain("Node.js");
  });
});

describe("computeSkillGapAnalysis — jobsUnlocked", () => {
  it("counts a job as unlocked only when the missing skill is the SOLE missing required skill", () => {
    const jobs = [
      job(["React", "Node.js"]), // candidate has React, missing only Node.js -> unlocked by Node.js
      job(["React", "Node.js", "TypeScript"]), // missing Node.js AND TypeScript -> NOT unlocked by either alone
    ];
    const result = computeSkillGapAnalysis(["React"], jobs);

    const nodeJs = result.topMissingSkills.find((s) => s.skill === "Node.js")!;
    expect(nodeJs.jobsUnlocked).toBe(1); // only the first job

    const typescript = result.topMissingSkills.find((s) => s.skill === "TypeScript")!;
    expect(typescript.jobsUnlocked).toBe(0); // second job still needs Node.js too
  });

  it("does not count preferred-only skills toward jobsUnlocked (only required gaps matter)", () => {
    const jobs = [job(["React"], ["GraphQL"])]; // candidate already has React; GraphQL is preferred, not required
    const result = computeSkillGapAnalysis(["React"], jobs);
    const graphql = result.topMissingSkills.find((s) => s.skill === "GraphQL")!;
    expect(graphql.jobsUnlocked).toBe(0);
  });

  it("sorts topMissingSkills by jobsUnlocked first, then demand percentage", () => {
    const jobs = [
      job(["React", "SkillA"]), // SkillA unlocks this one job
      job(["SkillB"]),
      job(["SkillB"]),
      job(["SkillB"]),
    ];
    const result = computeSkillGapAnalysis(["React"], jobs);
    // SkillA unlocks 1 job (candidate has React already); SkillB unlocks 3 jobs (candidate has nothing there, but each job only needs SkillB)
    expect(result.topMissingSkills[0]!.skill).toBe("SkillB");
  });

  it("caps topMissingSkills at 10", () => {
    const jobs = Array.from({ length: 15 }, (_, i) => job([`Skill${i}`]));
    const result = computeSkillGapAnalysis([], jobs);
    expect(result.topMissingSkills.length).toBeLessThanOrEqual(10);
  });
});
