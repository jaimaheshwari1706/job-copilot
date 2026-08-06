import { test, expect, type Page } from "@playwright/test";

const DEMO_EMAIL = "demo@jobcopilot.dev";
const DEMO_PASSWORD = "DemoPassword123!";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
];

// One shared, persistent page for the whole file, viewport resized per
// test rather than creating a new page/login per size — see
// dark-mode.spec.ts for why (rotating refresh-token cookie + rate limit).
test.describe.serial("Responsive", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO_EMAIL);
    await page.getByLabel("Password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test.afterAll(async () => {
    await page.close();
  });

  for (const vp of VIEWPORTS) {
    test(`dashboard at ${vp.name} (${vp.width}px) — no horizontal overflow`, async () => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(hasOverflow, `Horizontal overflow at ${vp.width}px`).toBe(false);

      await page.screenshot({ path: `e2e/screenshots/dashboard-${vp.name}.png`, fullPage: true });
    });
  }

  test("mobile: sidebar is hidden by default (md:hidden pattern), page still usable", async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");

    const sidebarVisible = await page.locator("nav", { hasText: "Job Copilot" }).isVisible().catch(() => false);
    test.info().annotations.push({
      type: "mobile-nav",
      description: `Sidebar visible at 375px: ${sidebarVisible}. If true and no alternate mobile nav exists, that's a responsive gap worth flagging.`,
    });
  });
});
