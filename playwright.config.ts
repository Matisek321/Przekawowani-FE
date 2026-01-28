import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  /* === Test directory === */
  testDir: "./tests/e2e",

  /* === Test file patterns === */
  testMatch: "**/*.spec.ts",

  /* === Run tests in files in parallel === */
  fullyParallel: true,

  /* === Fail the build on CI if you accidentally left test.only in the source code === */
  forbidOnly: !!process.env.CI,

  /* === Retry on CI only === */
  retries: process.env.CI ? 2 : 0,

  /* === Opt out of parallel tests on CI === */
  workers: process.env.CI ? 1 : undefined,

  /* === Reporter to use === */
  reporter: [["html", { open: "never" }], ["list"]],

  /* === Shared settings for all the projects below === */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "on-first-retry",
  },

  /* === Projects - Only Chromium as per guidelines === */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* === Run your local dev server before starting the tests === */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* === Output folder for test artifacts === */
  outputDir: "./tests/e2e/test-results",

  /* === Timeout settings === */
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },
});
