/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    // Playwright E2E specs (apps/web/e2e/*.spec.ts) use a different test
    // API (@playwright/test) and must only run via `npx playwright test`,
    // never picked up by Vitest's default *.spec.ts glob.
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
