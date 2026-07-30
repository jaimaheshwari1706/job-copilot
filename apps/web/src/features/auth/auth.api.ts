import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AuthUser,
  LoginInput,
  LoginResponse,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@job-copilot/shared";
import { apiClient, setAccessToken } from "../../lib/api-client";
import { useAuthStore } from "../../stores/auth.store";

const ME_QUERY_KEY = ["auth", "me"] as const;

/** Silently attempts to establish a session from the refresh cookie on app load. */
export function useBootstrapAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  return useQuery({
    queryKey: ["auth", "bootstrap"],
    queryFn: async () => {
      try {
        const data = await apiClient.post<LoginResponse>("/auth/refresh");
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data.user;
      } catch {
        setAccessToken(null);
        setUser(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    retry: false,
    staleTime: Infinity,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (input: LoginInput) => apiClient.post<LoginResponse>("/auth/login", input),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      setUser(data.user);
      queryClient.setQueryData(ME_QUERY_KEY, data.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (input: RegisterInput) => apiClient.post<LoginResponse>("/auth/register", input),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      setUser(data.user);
      queryClient.setQueryData(ME_QUERY_KEY, data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: () => apiClient.post<{ loggedOut: true }>("/auth/logout"),
    onSuccess: () => {
      setAccessToken(null);
      setUser(null);
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      apiClient.post<{ sent: true; devToken?: string }>("/auth/forgot-password", input),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      apiClient.post<{ reset: true }>("/auth/reset-password", input),
  });
}

export function useCurrentUser() {
  return useQuery<AuthUser>({
    queryKey: ME_QUERY_KEY,
    queryFn: () => apiClient.get<AuthUser>("/auth/me"),
    retry: false,
  });
}
