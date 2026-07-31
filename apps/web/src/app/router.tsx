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
import { ResumePage } from "../features/resume/ResumePage";
import { JobsPage } from "../features/jobs/JobsPage";
import { JobDetailPage } from "../features/jobs/JobDetailPage";
import { SavedJobsPage } from "../features/jobs/SavedJobsPage";
import { RecommendedJobsPage } from "../features/jobs/RecommendedJobsPage";
import { JdAnalyzerPage } from "../features/ai/JdAnalyzerPage";
import { ApplicationsPage } from "../features/applications/ApplicationsPage";
import { ApplicationDetailPage } from "../features/applications/ApplicationDetailPage";
import { SkillsPage } from "../features/skills/SkillsPage";
import { InterviewHomePage } from "../features/interview/InterviewHomePage";
import { InterviewSessionPage } from "../features/interview/InterviewSessionPage";
import { AlertsPage } from "../features/alerts/AlertsPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";

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
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/jobs", element: <JobsPage /> },
          {
            path: "/jobs/recommended",
            element: <RecommendedJobsPage />,
          },
          { path: "/jobs/saved", element: <SavedJobsPage /> },
          { path: "/jobs/:id", element: <JobDetailPage /> },
          { path: "/jobs/compare", element: <PlaceholderPage title="Compare Jobs" phase="Phase 7" /> },
          { path: "/jobs/analyze", element: <JdAnalyzerPage /> },
          { path: "/resume", element: <ResumePage /> },
          { path: "/skills", element: <SkillsPage /> },
          { path: "/interview", element: <InterviewHomePage /> },
          { path: "/interview/session/:id", element: <InterviewSessionPage /> },
          { path: "/applications", element: <ApplicationsPage /> },
          { path: "/applications/:id", element: <ApplicationDetailPage /> },
          { path: "/alerts", element: <AlertsPage /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/settings", element: <PlaceholderPage title="Settings" phase="Phase 3" /> },
          { path: "/system-health", element: <SystemHealthPage /> },
        ],
      },
    ],
  },
]);
