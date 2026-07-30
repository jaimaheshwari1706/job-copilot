import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "../lib/query-client";
import { router } from "./router";
import { useBootstrapAuth } from "../features/auth/auth.api";

function AuthBootstrap() {
  useBootstrapAuth();
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
