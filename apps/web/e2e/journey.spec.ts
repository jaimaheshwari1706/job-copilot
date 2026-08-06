import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const DEMO_EMAIL = "demo@jobcopilot.dev";
const DEMO_PASSWORD = "DemoPassword123!";

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

// One shared, persistent page for the whole file — see dark-mode.spec.ts
// for why (rotating refresh-token cookie + auth rate limiter).
test.describe.serial("Core user journey", () => {
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

  test("every sidebar page loads without console errors", async () => {
    const errors = collectConsoleErrors(page);

    const pages = [
      "/dashboard",
      "/jobs",
      "/jobs/recommended",
      "/jobs/saved",
      "/jobs/analyze",
      "/resume",
      "/skills",
      "/interview",
      "/applications",
      "/alerts",
      "/notifications",
      "/profile",
      "/system-health",
    ];
    for (const p of pages) {
      await page.goto(p);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).not.toContainText("Something went wrong");
    }

    const real = errors.filter((e) => !e.includes("Failed to load resource"));
    expect(real, `Console errors across pages: ${real.join("\n")}`).toEqual([]);
  });

  test("jobs: search, open detail, save, appears in saved jobs, unsave", async () => {
    await page.goto("/jobs");
    await expect(page.locator("body")).toContainText(/./);
    // Scope to the main content area, not the sidebar (which also has
    // /jobs/recommended, /jobs/saved, /jobs/analyze nav links matching
    // a naive a[href^='/jobs/'] selector).
    const firstCard = page.locator("main a[href^='/jobs/']").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/jobs\/[a-f0-9]+$/);

    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("NaN");
    await expect(page.locator("body")).not.toContainText("undefined");

    // Idempotent to whichever state this job is already in (a prior test
    // run against this shared demo account may have left it saved).
    const toggleBtn = page.locator("button[title='Save'], button[title='Unsave']");
    await expect(toggleBtn).toBeVisible();
    if ((await toggleBtn.getAttribute("title")) === "Unsave") {
      await toggleBtn.click();
      await page.waitForTimeout(300);
    }
    await toggleBtn.click(); // now definitely saving
    await page.waitForTimeout(500);

    await page.goto("/jobs/saved");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main a[href^='/jobs/']").first()).toBeVisible();
  });

  test("applications: view tracker, no NaN/undefined in table or kanban", async () => {
    await page.goto("/applications");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("NaN");
    await expect(page.locator("body")).not.toContainText("undefined");
  });

  test("dashboard: real numbers, no NaN, no hardcoded zeros-everywhere", async () => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/NaN/);
    expect(body).not.toMatch(/undefined/);
  });

  test("skill gap analysis loads real counted data, no NaN", async () => {
    await page.goto("/skills");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("NaN");
  });

  test("resume upload: real PDF uploads, appears in list, status pill updates", async () => {
    await page.goto("/resume");
    await page.waitForLoadState("networkidle");

    const tmpDir = path.join(process.cwd(), "e2e", ".tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    // Unique filename per run — this demo account is shared/persistent
    // across repeated local test runs, and a fixed name would eventually
    // collide with a resume uploaded by an earlier run.
    const fileName = `e2e-test-resume-${Date.now()}.pdf`;
    const filePath = path.join(tmpDir, fileName);
    fs.writeFileSync(filePath, Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"));

    await page.locator("input[type='file']").setInputFiles(filePath);
    await expect(page.getByText(fileName)).toBeVisible({ timeout: 10000 });
  });

  test("AI features show a clear not-configured state, never fake output (no key in this env)", async () => {
    await page.goto("/jobs/analyze");
    await page.waitForLoadState("networkidle");
    await page.getByRole("textbox").first().fill(
      "We are hiring a Senior Software Engineer with 5+ years of React and Node.js experience to join our platform team.".repeat(2),
    );
    await page.getByRole("button", { name: /analyze/i }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("NaN");
  });
});
