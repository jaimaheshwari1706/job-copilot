import { useQuery } from "@tanstack/react-query";
import type { Match } from "@job-copilot/shared";
import { apiClient } from "../../lib/api-client";

export function useMatch(jobId: string | undefined) {
  return useQuery({
    queryKey: ["matches", jobId],
    queryFn: () => apiClient.get<Match>(`/matches/${jobId}`),
    enabled: Boolean(jobId),
    staleTime: 5 * 60 * 1000, // matches are cached server-side too; avoid refetching every mount
  });
}
