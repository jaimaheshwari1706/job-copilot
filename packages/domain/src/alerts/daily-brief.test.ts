import { describe, expect, it } from "vitest";
import { buildDailyBriefSummary } from "./daily-brief.js";

describe("buildDailyBriefSummary", () => {
  it("includes the exact counts passed in, not estimates", () => {
    const { body } = buildDailyBriefSummary({
      newJobsCount: 147,
      relevantJobsCount: 31,
      strongMatchesCount: 12,
      topOpportunities: [],
    });
    expect(body).toContain("147 new jobs");
    expect(body).toContain("31 relevant");
    expect(body).toContain("12 strong matches");
  });

  it("uses singular phrasing for a count of 1", () => {
    const { title, body } = buildDailyBriefSummary({
      newJobsCount: 1,
      relevantJobsCount: 1,
      strongMatchesCount: 1,
      topOpportunities: [],
    });
    expect(body).toContain("1 new job,");
    expect(body).toContain("1 strong match");
    expect(title).toContain("1 strong match");
  });

  it("lists top opportunities with their real scores", () => {
    const { body } = buildDailyBriefSummary({
      newJobsCount: 5,
      relevantJobsCount: 3,
      strongMatchesCount: 2,
      topOpportunities: [
        { title: "Full Stack Developer", company: "Acme", score: 94 },
        { title: "React Developer", company: "Globex", score: 88 },
      ],
    });
    expect(body).toContain("1. Full Stack Developer at Acme — 94%");
    expect(body).toContain("2. React Developer at Globex — 88%");
  });

  it("omits the opportunities section entirely when there are none", () => {
    const { body } = buildDailyBriefSummary({
      newJobsCount: 5,
      relevantJobsCount: 0,
      strongMatchesCount: 0,
      topOpportunities: [],
    });
    expect(body).not.toContain("Top opportunities");
  });
});
