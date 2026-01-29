import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";
import { AuthButtonComponent } from "./components/AuthButtonComponent";

/**
 * Page Object Model for the Account settings page.
 * Handles user account management.
 */
export class AccountPage extends BasePage {
  // Auth component (for navigation)
  readonly authButton: AuthButtonComponent;

  // Page states
  readonly loadingState: Locator;
  readonly errorState: Locator;
  readonly errorAlert: Locator;
  readonly pageContainer: Locator;
  readonly pageTitle: Locator;

  // Profile section
  readonly profileSection: Locator;
  readonly profileEmail: Locator;
  readonly profileDisplayName: Locator;
  readonly profileDisplayNameNotSet: Locator;
  readonly setDisplayNameLink: Locator;

  constructor(page: Page) {
    super(page);

    // Auth component
    this.authButton = new AuthButtonComponent(page);

    // Page states
    this.loadingState = this.getByTestId("account-page-loading");
    this.errorState = this.getByTestId("account-page-error");
    this.errorAlert = this.getByTestId("account-page-error-alert");
    this.pageContainer = this.getByTestId("account-page");
    this.pageTitle = this.getByTestId("account-page-title");

    // Profile section
    this.profileSection = this.getByTestId("profile-section");
    this.profileEmail = this.getByTestId("profile-section-email");
    this.profileDisplayName = this.getByTestId("profile-section-display-name");
    this.profileDisplayNameNotSet = this.getByTestId(
      "profile-section-display-name-not-set"
    );
    this.setDisplayNameLink = this.getByTestId(
      "profile-section-set-display-name-link"
    );
  }

  /**
   * Navigate to the account page.
   */
  async goto(): Promise<void> {
    await this.page.goto("/account");
    await this.waitForPageLoad();
  }

  /**
   * Wait for the page to finish loading.
   */
  async waitForLoaded(): Promise<void> {
    await this.waitForVisible(this.pageContainer);
  }

  /**
   * Navigate to set display name page via link.
   */
  async goToSetDisplayName(): Promise<void> {
    await this.setDisplayNameLink.click();
    await this.page.waitForURL(/display-name/);
  }

  /**
   * Assert that the page is loaded and visible.
   */
  async expectPageVisible(): Promise<void> {
    await expect(this.pageContainer).toBeVisible();
    await expect(this.pageTitle).toBeVisible();
    await expect(this.profileSection).toBeVisible();
  }

  /**
   * Assert that loading state is displayed.
   */
  async expectLoading(): Promise<void> {
    await expect(this.loadingState).toBeVisible();
  }

  /**
   * Assert that error state is displayed.
   */
  async expectError(message?: string): Promise<void> {
    await expect(this.errorState).toBeVisible();
    await expect(this.errorAlert).toBeVisible();
    if (message) {
      await expect(this.errorAlert).toContainText(message);
    }
  }

  /**
   * Assert that the email is displayed correctly.
   */
  async expectEmail(email: string): Promise<void> {
    await expect(this.profileEmail).toContainText(email);
  }

  /**
   * Assert that the display name is set.
   */
  async expectDisplayName(displayName: string): Promise<void> {
    await expect(this.profileDisplayName).toContainText(displayName);
  }

  /**
   * Assert that display name is not set.
   */
  async expectDisplayNameNotSet(): Promise<void> {
    await expect(this.profileDisplayNameNotSet).toBeVisible();
    await expect(this.setDisplayNameLink).toBeVisible();
  }

  /**
   * Check if display name is set.
   */
  async hasDisplayName(): Promise<boolean> {
    return this.profileDisplayName.isVisible();
  }

  /**
   * Get the current display name value.
   */
  async getDisplayName(): Promise<string | null> {
    if (await this.hasDisplayName()) {
      return (await this.profileDisplayName.textContent()) ?? null;
    }
    return null;
  }

  /**
   * Get the email value.
   */
  async getEmail(): Promise<string> {
    return (await this.profileEmail.textContent()) ?? "";
  }
}
