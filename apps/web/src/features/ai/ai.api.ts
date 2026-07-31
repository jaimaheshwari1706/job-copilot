import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  JdAnalysisResult,
  JdAnalysisRequest,
  CoverLetterDto,
  GenerateCoverLetterRequest,
  UpdateCoverLetterInput,
} from "@job-copilot/shared";
import { apiClient } from "../../lib/api-client";

export function useAiStatus() {
  return useQuery({
    queryKey: ["ai", "status"],
    queryFn: () => apiClient.get<{ configured: boolean }>("/ai/status"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyzeJobDescription() {
  return useMutation({
    mutationFn: (input: JdAnalysisRequest) =>
      apiClient.post<JdAnalysisResult>("/ai/analyze-job-description", input),
  });
}

export function useCoverLetter(jobId: string | undefined) {
  return useQuery({
    queryKey: ["ai", "cover-letter", jobId],
    queryFn: () => apiClient.get<CoverLetterDto | null>(`/ai/cover-letter/${jobId}`),
    enabled: Boolean(jobId),
  });
}

export function useGenerateCoverLetter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateCoverLetterRequest) =>
      apiClient.post<CoverLetterDto>("/ai/cover-letter", input),
    onSuccess: (data) => queryClient.setQueryData(["ai", "cover-letter", data.jobId], data),
  });
}

export function useUpdateCoverLetter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string } & UpdateCoverLetterInput) =>
      apiClient.patch<CoverLetterDto>(`/ai/cover-letter/${id}`, { content }),
    onSuccess: (data) => queryClient.setQueryData(["ai", "cover-letter", data.jobId], data),
  });
}
