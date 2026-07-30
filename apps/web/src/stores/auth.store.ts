import { create } from "zustand";
import type { AuthUser } from "@job-copilot/shared";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (isLoading: boolean) => void;
}

/**
 * Deliberately minimal — no persistence beyond this in-memory store.
 * Note what this store intentionally does NOT hold: access tokens,
 * refresh tokens, or anything from the auth cookie. Those never touch
 * client-side JS per the session-model amendment (Phase 0 §2).
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  setLoading: (isLoading) => set({ isLoading }),
}));
