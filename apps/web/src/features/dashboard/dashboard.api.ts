import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@job-copilot/shared";
import { apiClient } from "../../lib/api-client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiClient.get<DashboardStats>("/dashboard"),
  });
}
