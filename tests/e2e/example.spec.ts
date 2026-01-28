import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");

    // Check that the page has loaded
    await expect(page).toHaveTitle(/Przekawowani/i);
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");

    // Find and click the login link/button
    const loginLink = page.getByRole("link", { name: /zaloguj/i });

    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });
});
