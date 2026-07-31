import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JobAlertDto, CreateJobAlertInput, UpdateJobAlertInput } from "@job-copilot/shared";
import { apiClient } from "../../lib/api-client";

const ALERTS_KEY = ["alerts"] as const;

export function useAlerts() {
  return useQuery({ queryKey: ALERTS_KEY, queryFn: () => apiClient.get<JobAlertDto[]>("/alerts") });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJobAlertInput) => apiClient.post<JobAlertDto>("/alerts", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateJobAlertInput) =>
      apiClient.patch<JobAlertDto>(`/alerts/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: true }>(`/alerts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}
