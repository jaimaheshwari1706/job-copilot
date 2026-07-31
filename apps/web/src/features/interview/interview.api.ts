import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  InterviewSessionDto,
  StartPrepSessionInput,
  StartMockSessionInput,
} from "@job-copilot/shared";
import { apiClient } from "../../lib/api-client";

export function useInterviewSessions() {
  return useQuery({
    queryKey: ["interview", "sessions"],
    queryFn: () => apiClient.get<InterviewSessionDto[]>("/interview"),
  });
}

export function useInterviewSession(id: string | undefined) {
  return useQuery({
    queryKey: ["interview", "session", id],
    queryFn: () => apiClient.get<InterviewSessionDto>(`/interview/session/${id}`),
    enabled: Boolean(id),
  });
}

export function useStartPrepSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StartPrepSessionInput) =>
      apiClient.post<InterviewSessionDto>("/interview/prep", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["interview", "sessions"] }),
  });
}

export function useStartMockSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StartMockSessionInput) =>
      apiClient.post<InterviewSessionDto>("/interview/mock/start", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["interview", "sessions"] }),
  });
}

export function useSubmitMockAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, answer }: { sessionId: string; answer: string }) =>
      apiClient.post<InterviewSessionDto>(`/interview/mock/${sessionId}/answer`, { answer }),
    onSuccess: (data) => queryClient.setQueryData(["interview", "session", data.id], data),
  });
}
