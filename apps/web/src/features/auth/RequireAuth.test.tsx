import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";
import { useAuthStore } from "../../stores/auth.store";

function renderWithGuard(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<div>Onboarding wizard</div>} />
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  });

  it("redirects to /login when not authenticated", () => {
    renderWithGuard("/dashboard");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders the protected content when authenticated and onboarded", () => {
    useAuthStore.setState({
      user: { id: "1", email: "test@example.com", onboardingCompletedAt: "2026-01-01T00:00:00Z" },
      isAuthenticated: true,
      isLoading: false,
    });
    renderWithGuard("/dashboard");
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("shows a loading state instead of redirecting while auth bootstrap is in flight", () => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: true });
    renderWithGuard("/dashboard");
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it("redirects an authenticated but not-yet-onboarded user to /onboarding", () => {
    useAuthStore.setState({
      user: { id: "1", email: "test@example.com" },
      isAuthenticated: true,
      isLoading: false,
    });
    renderWithGuard("/dashboard");
    expect(screen.getByText("Onboarding wizard")).toBeInTheDocument();
  });

  it("redirects an already-onboarded user away from /onboarding", () => {
    useAuthStore.setState({
      user: { id: "1", email: "test@example.com", onboardingCompletedAt: "2026-01-01T00:00:00Z" },
      isAuthenticated: true,
      isLoading: false,
    });
    renderWithGuard("/onboarding");
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });
});
