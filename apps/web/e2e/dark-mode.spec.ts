import { test, expect, type Page } from "@playwright/test";

const DEMO_EMAIL = "demo@jobcopilot.dev";
const DEMO_PASSWORD = "DemoPassword123!";

/**
 * One shared page/context per file (test.describe.serial + beforeAll),
 * logged in once. Deliberately NOT storageState-per-test: this app
 * rotates the refresh-token cookie on every /auth/refresh call (a real,
 * intentional security feature, confirmed in Phase 10), so a static
 * storageState snapshot goes stale after the first test consumes it.
 * A single persistent page carries the rotating cookie forward
 * correctly, and only logs in once per file — also easier on the auth
 * rate limiter (20 req/15min) than a fresh login per test.
 */
test.describe.serial("Dark mode", () => {
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

  test("toggle switches theme, persists across reload, no flash, html class is authoritative", async () => {
    await page.goto("/dashboard");
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: /toggle dark mode/i }).click();
    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await expect(html).toHaveClass(/dark/);

    const stored = await page.evaluate(() => localStorage.getItem("job-copilot:theme"));
    expect(stored).toBe("dark");

    await page.getByRole("button", { name: /toggle dark mode/i }).click();
    await expect(html).not.toHaveClass(/dark/);
    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("no flash of wrong theme on load when dark is stored", async () => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /toggle dark mode/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();
    await page.waitForURL(/\/dashboard/);
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Reset to light for subsequent tests in this file.
    await page.getByRole("button", { name: /toggle dark mode/i }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("login page — light and dark screenshots (unauthenticated view, own tab)", async ({ browser }) => {
    const freshPage = await browser.newPage();
    await freshPage.goto("/login");
    await expect(freshPage.locator("html")).not.toHaveClass(/dark/);
    await freshPage.screenshot({ path: "e2e/screenshots/login-light.png", fullPage: true });

    await freshPage.evaluate(() => localStorage.setItem("job-copilot:theme", "dark"));
    await freshPage.reload();
    await expect(freshPage.locator("html")).toHaveClass(/dark/);
    await freshPage.screenshot({ path: "e2e/screenshots/login-dark.png", fullPage: true });
    await freshPage.close();
  });

  for (const mode of ["light", "dark"] as const) {
    test(`dashboard — ${mode} screenshot`, async () => {
      await page.goto("/dashboard");
      const isDark = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
      if ((mode === "dark") !== isDark) {
        await page.getByRole("button", { name: /toggle dark mode/i }).click();
      }
      await page.waitForTimeout(300);
      await page.screenshot({ path: `e2e/screenshots/dashboard-${mode}.png`, fullPage: true });
    });

    test(`jobs list — ${mode} screenshot`, async () => {
      await page.goto("/jobs");
      const isDark = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
      if ((mode === "dark") !== isDark) {
        await page.getByRole("button", { name: /toggle dark mode/i }).click();
      }
      await page.waitForTimeout(300);
      await page.screenshot({ path: `e2e/screenshots/jobs-${mode}.png`, fullPage: true });
    });
  }
});
