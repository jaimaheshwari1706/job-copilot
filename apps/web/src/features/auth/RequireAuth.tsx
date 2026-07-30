import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";

export function RequireAuth() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-sm text-slate-400">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasCompletedOnboarding = Boolean(user?.onboardingCompletedAt);
  const onOnboardingRoute = location.pathname === "/onboarding";

  if (!hasCompletedOnboarding && !onOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }
  if (hasCompletedOnboarding && onOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
