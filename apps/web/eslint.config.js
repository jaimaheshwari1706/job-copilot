import base from "@job-copilot/config/eslint";

export default [
  {
    // Playwright's own generated output — HTML report + trace viewer
    // assets (third-party minified bundles) — not project source. Caught
    // when this genuinely broke `npm run lint` with ~2800 errors from a
    // minified vendor file after the first full E2E run.
    ignores: ["playwright-report/**", "test-results/**", "e2e/.tmp/**", "e2e/.auth/**"],
  },
  ...base,
];
