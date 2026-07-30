import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Resume } from "@job-copilot/shared";
import { apiClient } from "../../lib/api-client";

const RESUMES_QUERY_KEY = ["resumes"] as const;

export function useResumes() {
  return useQuery({
    queryKey: RESUMES_QUERY_KEY,
    queryFn: () => apiClient.get<Resume[]>("/resumes"),
    refetchInterval: (query) => {
      const data = query.state.data;
      const anyInFlight = data?.some(
        (r) => r.textExtractionStatus === "pending" || r.textExtractionStatus === "processing",
      );
      return anyInFlight ? 1500 : false;
    },
  });
}

export function useResume(id: string | undefined) {
  return useQuery({
    queryKey: ["resumes", id],
    queryFn: () => apiClient.get<Resume>(`/resumes/${id}`),
    enabled: Boolean(id),
    // Poll while extraction is still in flight so status updates show up
    // without a manual refresh, then stop once it settles.
    refetchInterval: (query) => {
      const status = query.state.data?.textExtractionStatus;
      return status === "pending" || status === "processing" ? 1500 : false;
    },
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.upload<Resume>("/resumes", formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY }),
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: true }>(`/resumes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY }),
  });
}

export function useSetPrimaryResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<Resume>(`/resumes/${id}/set-primary`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY }),
  });
}

export function useResumeDownloadUrl() {
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.get<{ url: string; expiresAt: number }>(`/resumes/${id}/download-url`),
  });
}
