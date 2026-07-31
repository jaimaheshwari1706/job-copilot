import { describe, expect, it } from "vitest";
import { jobMatchesAlertCriteria, type AlertableJob } from "./alert-matcher.js";

function job(overrides: Partial<AlertableJob> = {}): AlertableJob {
  return { title: "Full Stack Developer", skills: ["React", "Node.js"], ...overrides };
}

describe("jobMatchesAlertCriteria", () => {
  it("matches everything when no criteria are set", () => {
    expect(jobMatchesAlertCriteria(job(), {})).toBe(true);
  });

  it("matches on keyword found in title", () => {
    expect(jobMatchesAlertCriteria(job({ title: "Senior React Engineer" }), { keywords: "react" })).toBe(true);
  });

  it("matches on keyword found in skills when not in title", () => {
    expect(jobMatchesAlertCriteria(job({ title: "Backend Engineer", skills: ["Python"] }), { keywords: "python" })).toBe(true);
  });

  it("rejects when keyword is in neither title nor skills", () => {
    expect(jobMatchesAlertCriteria(job(), { keywords: "kubernetes" })).toBe(false);
  });

  it("matches when the job has ANY of the requested skills", () => {
    expect(jobMatchesAlertCriteria(job({ skills: ["React"] }), { skills: ["React", "Vue"] })).toBe(true);
  });

  it("rejects when the job has NONE of the requested skills", () => {
    expect(jobMatchesAlertCriteria(job({ skills: ["Python"] }), { skills: ["React", "Vue"] })).toBe(false);
  });

  it("matches on a location substring", () => {
    expect(jobMatchesAlertCriteria(job({ location: "Bangalore, India" }), { location: "Bangalore" })).toBe(true);
  });

  it("rejects a job with no location when a location is required", () => {
    expect(jobMatchesAlertCriteria(job({ location: undefined }), { location: "Remote" })).toBe(false);
  });

  it("requires an exact workMode match", () => {
    expect(jobMatchesAlertCriteria(job({ workMode: "remote" }), { workMode: "remote" })).toBe(true);
    expect(jobMatchesAlertCriteria(job({ workMode: "onsite" }), { workMode: "remote" })).toBe(false);
  });

  it("matches when the job's experience requirement is at or below the alert's experienceMin", () => {
    expect(jobMatchesAlertCriteria(job({ experienceMin: 2 }), { experienceMin: 3 })).toBe(true);
    expect(jobMatchesAlertCriteria(job({ experienceMin: 5 }), { experienceMin: 3 })).toBe(false);
  });

  it("matches when the job's salary ceiling meets the alert's salaryMin floor", () => {
    expect(jobMatchesAlertCriteria(job({ salaryMax: 150000 }), { salaryMin: 100000 })).toBe(true);
    expect(jobMatchesAlertCriteria(job({ salaryMax: 80000 }), { salaryMin: 100000 })).toBe(false);
  });

  it("requires ALL set criteria to pass, not just one", () => {
    const j = job({ skills: ["React"], location: "Remote", workMode: "remote" });
    expect(jobMatchesAlertCriteria(j, { skills: ["React"], location: "Remote", workMode: "onsite" })).toBe(false);
  });
});
