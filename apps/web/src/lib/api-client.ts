import type { ApiResponse } from "@job-copilot/shared";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/**
 * The access token lives ONLY in memory for the lifetime of the tab — never
 * localStorage/sessionStorage, never a Zustand-persisted store. On a hard
 * refresh it's re-obtained via POST /auth/refresh, which reads the HttpOnly
 * refresh cookie the browser sends automatically. See stores/auth.store.ts.
 */
let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}

let refreshInFlight: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;
        const body = (await res.json()) as ApiResponse<{ accessToken: string }>;
        if (!body.success) return false;
        setAccessToken(body.data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const isFormData = init?.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include", // sends the HttpOnly refresh cookie
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
    ...init,
  });

  // Access token expired mid-session: try one silent refresh, then retry
  // the original request once. Never loop more than once.
  if (res.status === 401 && !isRetry && path !== "/auth/refresh" && path !== "/auth/login") {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return request<T>(path, init, true);
    }
  }

  const body = (await res.json()) as ApiResponse<T>;

  if (!body.success) {
    throw new ApiRequestError(body.error.message, res.status, body.error.code, body.error.details);
  }
  return body.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /** For multipart/form-data uploads — do not set Content-Type manually, the browser adds the boundary. */
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", body: formData }),
};
