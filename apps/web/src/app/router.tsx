import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { PlaceholderPage } from "../components/PlaceholderPage";
import { SystemHealthPage } from "../pages/SystemHealthPage";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { RequireAuth } from "../features/auth/RequireAuth";
import { OnboardingWizard } from "../features/onboarding/OnboardingWizard";
import { ProfilePage } from "../features/profile/ProfilePage";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      // Onboarding intentionally sits outside AppLayout (no sidebar/topbar)
      // so the wizard gets full focus, matching the Auth pages' framing.
      { path: "/onboarding", element: <OnboardingWizard /> },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <PlaceholderPage title="Dashboard" phase="Phase 13" /> },
          { path: "/jobs", element: <PlaceholderPage title="Discover Jobs" phase="Phase 5" /> },
          {
            path: "/jobs/recommended",
            element: <PlaceholderPage title="Recommended Jobs" phase="Phase 7" />,
          },
          { path: "/jobs/saved", element: <PlaceholderPage title="Saved Jobs" phase="Phase 5" /> },
          { path: "/jobs/:id", element: <PlaceholderPage title="Job Details" phase="Phase 5" /> },
          { path: "/jobs/compare", element: <PlaceholderPage title="Compare Jobs" phase="Phase 7" /> },
          { path: "/resume", element: <PlaceholderPage title="Resume" phase="Phase 4" /> },
          { path: "/resume/upload", element: <PlaceholderPage title="Upload Resume" phase="Phase 4" /> },
          { path: "/skills", element: <PlaceholderPage title="Skill Analysis" phase="Phase 10" /> },
          { path: "/interview", element: <PlaceholderPage title="Interview Prep" phase="Phase 11" /> },
          { path: "/applications", element: <PlaceholderPage title="Applications" phase="Phase 9" /> },
          { path: "/alerts", element: <PlaceholderPage title="Alerts" phase="Phase 12" /> },
          { path: "/notifications", element: <PlaceholderPage title="Notifications" phase="Phase 12" /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/settings", element: <PlaceholderPage title="Settings" phase="Phase 3" /> },
          { path: "/system-health", element: <SystemHealthPage /> },
        ],
      },
    ],
  },
]);
