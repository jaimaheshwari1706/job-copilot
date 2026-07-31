export interface DailyBriefOpportunity {
  title: string;
  company: string;
  score: number;
}

export interface DailyBriefStats {
  newJobsCount: number;
  relevantJobsCount: number;
  strongMatchesCount: number;
  topOpportunities: DailyBriefOpportunity[];
}

/**
 * Pure string templating over numbers the caller already counted from
 * real query results — this function never estimates or invents a
 * number. Matches the format from Phase 0 §26's example: "147 new jobs,
 * 31 relevant, 12 strong matches."
 */
export function buildDailyBriefSummary(stats: DailyBriefStats): { title: string; body: string } {
  const title = `Your daily job brief: ${stats.strongMatchesCount} strong match${stats.strongMatchesCount === 1 ? "" : "es"}`;

  const lines = [
    `${stats.newJobsCount} new job${stats.newJobsCount === 1 ? "" : "s"}`,
    `${stats.relevantJobsCount} relevant`,
    `${stats.strongMatchesCount} strong match${stats.strongMatchesCount === 1 ? "" : "es"}`,
  ];

  const opportunityLines = stats.topOpportunities
    .map((o, i) => `${i + 1}. ${o.title} at ${o.company} — ${o.score}%`)
    .join("\n");

  const body =
    lines.join(", ") +
    (stats.topOpportunities.length > 0 ? `\n\nTop opportunities:\n${opportunityLines}` : "");

  return { title, body };
}
