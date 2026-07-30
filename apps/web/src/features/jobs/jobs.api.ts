import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Job, JobSearchQuery, JobSearchResult, RecommendedJobsQuery } from "@job-copilot/shared";
import { apiClient } from "../../lib/api-client";

function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)));
    } else {
      search.set(key, String(value));
    }
  }
  return search.toString();
}

export function useJobSearch(filters: Partial<JobSearchQuery>) {
  const qs = toQueryString(filters);
  return useQuery({
    queryKey: ["jobs", "search", filters],
    queryFn: () => apiClient.get<JobSearchResult>(`/jobs${qs ? `?${qs}` : ""}`),
  });
}

export function useRecommendedJobs(filters: Partial<RecommendedJobsQuery>) {
  const qs = toQueryString(filters);
  return useQuery({
    queryKey: ["jobs", "recommended", filters],
    queryFn: () => apiClient.get<JobSearchResult>(`/jobs/recommended${qs ? `?${qs}` : ""}`),
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: () => apiClient.get<Job>(`/jobs/${id}`),
    enabled: Boolean(id),
  });
}

export function useSavedJobs() {
  return useQuery({
    queryKey: ["jobs", "saved"],
    queryFn: () => apiClient.get<Job[]>("/jobs/saved"),
  });
}

function useInvalidateJobQueries() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["jobs"] });
}

export function useSaveJob() {
  const invalidate = useInvalidateJobQueries();
  return useMutation({
    mutationFn: (jobId: string) => apiClient.post<{ saved: true }>(`/jobs/${jobId}/save`),
    onSuccess: invalidate,
  });
}

export function useHideJob() {
  const invalidate = useInvalidateJobQueries();
  return useMutation({
    mutationFn: (jobId: string) => apiClient.post<{ hidden: true }>(`/jobs/${jobId}/hide`),
    onSuccess: invalidate,
  });
}

export function useUnsaveJob() {
  const invalidate = useInvalidateJobQueries();
  return useMutation({
    mutationFn: (jobId: string) => apiClient.delete<{ cleared: true }>(`/jobs/${jobId}/save`),
    onSuccess: invalidate,
  });
}
