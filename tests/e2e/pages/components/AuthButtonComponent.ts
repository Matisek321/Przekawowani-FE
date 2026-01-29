import { type Locator, type Page, expect } from "@playwright/test";

/**
 * Component Object Model for the AuthButton component.
 * Handles user menu interactions in the navigation.
 * Can be composed into any page that has the navigation.
 */
export class AuthButtonComponent {
  readonly page: Page;

  // Unauthenticated state
  readonly loginButton: Locator;

  // Authenticated state - trigger
  readonly userMenuTrigger: Locator;
  readonly userDisplayName: Locator;

  // Dropdown menu
  readonly userMenu: Locator;
  readonly menuDisplayName: Locator;
  readonly menuEmail: Locator;
  readonly accountSettingsLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Unauthenticated state
    this.loginButton = page.getByTestId("auth-login-button");

    // Authenticated state - trigger
    this.userMenuTrigger = page.getByTestId("auth-user-menu-trigger");
    this.userDisplayName = page.getByTestId("auth-user-display-name");

    // Dropdown menu
    this.userMenu = page.getByTestId("auth-user-menu");
    this.menuDisplayName = page.getByTestId("auth-menu-display-name");
    this.menuEmail = page.getByTestId("auth-menu-email");
    this.accountSettingsLink = page.getByTestId("auth-account-settings-link");
    this.logoutButton = page.getByTestId("auth-logout-button");
  }

  /**
   * Check if user is logged in by verifying the user menu trigger is visible.
   */
  async isLoggedIn(): Promise<boolean> {
    return this.userMenuTrigger.isVisible();
  }

  /**
   * Check if user is logged out by verifying the login button is visible.
   */
  async isLoggedOut(): Promise<boolean> {
    return this.loginButton.isVisible();
  }

  /**
   * Open the user dropdown menu.
   */
  async openUserMenu(): Promise<void> {
    await this.userMenuTrigger.click();
    await expect(this.userMenu).toBeVisible();
  }

  /**
   * Close the user dropdown menu by clicking outside.
   */
  async closeUserMenu(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.userMenu).toBeHidden();
  }

  /**
   * Navigate to account settings via user menu.
   */
  async goToAccountSettings(): Promise<void> {
    await this.openUserMenu();
    await this.accountSettingsLink.click();
    await this.page.waitForURL(/account/);
  }

  /**
   * Logout the user via user menu.
   */
  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.logoutButton.click();
    await this.page.waitForURL("/");
  }

  /**
   * Navigate to login page via login button.
   */
  async goToLogin(): Promise<void> {
    // Wait for button to be visible (React hydration)
    await expect(this.loginButton).toBeVisible({ timeout: 10000 });
    await this.loginButton.click();
    await this.page.waitForURL(/login/, { waitUntil: "domcontentloaded" });
  }

  /**
   * Assert that the user is logged in with a specific display name.
   */
  async expectLoggedInAs(displayNameOrEmail: string): Promise<void> {
    await expect(this.userMenuTrigger).toBeVisible();
    await expect(this.userDisplayName).toContainText(displayNameOrEmail);
  }

  /**
   * Assert that the user is logged out.
   */
  async expectLoggedOut(): Promise<void> {
    // Wait longer for React hydration
    await expect(this.loginButton).toBeVisible({ timeout: 10000 });
    await expect(this.userMenuTrigger).toBeHidden();
  }

  /**
   * Get the displayed user name/email from the menu trigger.
   */
  async getDisplayedName(): Promise<string> {
    return (await this.userDisplayName.textContent()) ?? "";
  }

  /**
   * Assert the email displayed in the dropdown menu.
   */
  async expectMenuEmail(email: string): Promise<void> {
    await this.openUserMenu();
    await expect(this.menuEmail).toContainText(email);
  }
}
