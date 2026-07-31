import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Application,
  ApplicationEvent,
  ApplicationNote,
  CreateApplicationInput,
  UpdateApplicationInput,
} from "@job-copilot/shared";
import { apiClient } from "../../lib/api-client";

const APPLICATIONS_KEY = ["applications"] as const;

export function useApplications() {
  return useQuery({
    queryKey: APPLICATIONS_KEY,
    queryFn: () => apiClient.get<Application[]>("/applications"),
  });
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: ["applications", id],
    queryFn: () => apiClient.get<Application>(`/applications/${id}`),
    enabled: Boolean(id),
  });
}

export function useApplicationEvents(id: string | undefined) {
  return useQuery({
    queryKey: ["applications", id, "events"],
    queryFn: () => apiClient.get<ApplicationEvent[]>(`/applications/${id}/events`),
    enabled: Boolean(id),
  });
}

export function useApplicationNotes(id: string | undefined) {
  return useQuery({
    queryKey: ["applications", id, "notes"],
    queryFn: () => apiClient.get<ApplicationNote[]>(`/applications/${id}/notes`),
    enabled: Boolean(id),
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApplicationInput) => apiClient.post<Application>("/applications", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY }),
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateApplicationInput) =>
      apiClient.patch<Application>(`/applications/${id}`, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["applications", data.id, "events"] });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: true }>(`/applications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY }),
  });
}

export function useAddApplicationNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiClient.post<ApplicationNote>(`/applications/${id}/notes`, { content }),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ["applications", variables.id, "notes"] }),
  });
}
