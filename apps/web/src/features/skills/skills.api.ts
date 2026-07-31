import { useQuery } from "@tanstack/react-query";
import type { SkillGapAnalysisResult } from "@job-copilot/shared";
import { apiClient } from "../../lib/api-client";

export function useSkillGapAnalysis() {
  return useQuery({
    queryKey: ["skills", "gap-analysis"],
    queryFn: () => apiClient.get<SkillGapAnalysisResult>("/skills/gap-analysis"),
  });
}
