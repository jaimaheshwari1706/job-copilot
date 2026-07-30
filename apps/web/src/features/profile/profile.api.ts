import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Profile,
  ProfileUpdateInput,
  OnboardingInput,
  ConfirmSkillsInput,
} from "@job-copilot/shared";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../stores/auth.store";

const PROFILE_QUERY_KEY = ["profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => apiClient.get<Profile>("/profile"),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) => apiClient.patch<Profile>("/profile", input),
    onSuccess: (data) => queryClient.setQueryData(PROFILE_QUERY_KEY, data),
  });
}

export function useSaveOnboardingProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<OnboardingInput>) =>
      apiClient.patch<Profile>("/profile/onboarding", input),
    onSuccess: (data) => queryClient.setQueryData(PROFILE_QUERY_KEY, data),
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (input: OnboardingInput) =>
      apiClient.post<Profile>("/profile/onboarding/complete", input),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      // Reflect completion immediately in the auth store so RequireAuth-style
      // onboarding gates (if added later) don't need a full /auth/me refetch.
      if (user) setUser({ ...user, onboardingCompletedAt: data.onboardingCompletedAt ?? undefined });
    },
  });
}

export function useConfirmSkills() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConfirmSkillsInput) =>
      apiClient.post<Profile>("/profile/skills/confirm", input),
    onSuccess: (data) => queryClient.setQueryData(PROFILE_QUERY_KEY, data),
  });
}
