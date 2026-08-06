import { test, expect } from "@playwright/test";

const DEMO_EMAIL = "demo@jobcopilot.dev";
const DEMO_PASSWORD = "DemoPassword123!";

test.describe("Authentication", () => {
  test("unauthenticated user is redirected to /login from a protected route", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    expect(errors).toEqual([]);
  });

  test("login with valid credentials reaches the dashboard, refresh keeps session, logout blocks protected routes", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO_EMAIL);
    await page.getByLabel("Password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/your job search at a glance/i)).toBeVisible();

    // Session survives a hard reload (silent refresh via HttpOnly cookie)
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/your job search at a glance/i)).toBeVisible();

    // Logout
    await page.getByRole("button", { name: /log ?out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Protected route blocked after logout
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    const relevantErrors = consoleErrors.filter((e) => !e.includes("Failed to load resource"));
    expect(relevantErrors, `Unexpected console errors: ${relevantErrors.join("; ")}`).toEqual([]);
  });

  test("login with wrong password shows an inline error, not a crash", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO_EMAIL);
    await page.getByLabel("Password").fill("WrongPassword123!");
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page.locator("text=/invalid|incorrect|wrong/i").first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("register -> onboarding -> dashboard (new user journey)", async ({ page }) => {
    const email = `pw-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByLabel("Name").fill("Playwright Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("TestPassword123!");
    await page.getByRole("button", { name: /create account|sign up|register/i }).click();

    // New user should land in onboarding, not dashboard
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 });
  });
});
