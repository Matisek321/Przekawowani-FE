import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for the Set Display Name page.
 * Handles setting the user's display name.
 */
export class SetDisplayNamePage extends BasePage {
  // Page states
  readonly loadingSessionState: Locator;
  readonly loadingProfileState: Locator;
  readonly redirectingState: Locator;
  readonly errorState: Locator;
  readonly errorAlert: Locator;

  // Page container
  readonly pageContainer: Locator;
  readonly card: Locator;
  readonly pageTitle: Locator;
  readonly infoBanner: Locator;

  // Form
  readonly form: Locator;
  readonly formError: Locator;
  readonly displayNameInput: Locator;
  readonly fieldError: Locator;
  readonly characterCounter: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);

    // Page states
    this.loadingSessionState = this.getByTestId("set-display-name-page-loading-session");
    this.loadingProfileState = this.getByTestId("set-display-name-page-loading-profile");
    this.redirectingState = this.getByTestId("set-display-name-page-redirecting");
    this.errorState = this.getByTestId("set-display-name-page-error");
    this.errorAlert = this.getByTestId("set-display-name-page-error-alert");

    // Page container
    this.pageContainer = this.getByTestId("set-display-name-page");
    this.card = this.getByTestId("set-display-name-card");
    this.pageTitle = this.getByTestId("set-display-name-page-title");
    this.infoBanner = this.getByTestId("set-display-name-info-banner");

    // Form
    this.form = this.getByTestId("set-display-name-form");
    this.formError = this.getByTestId("set-display-name-form-error");
    this.displayNameInput = this.getByTestId("set-display-name-input");
    this.fieldError = this.getByTestId("set-display-name-field-error");
    this.characterCounter = this.getByTestId("set-display-name-counter");
    this.submitButton = this.getByTestId("set-display-name-submit-button");
  }

  /**
   * Navigate to the set display name page.
   */
  async goto(): Promise<void> {
    await this.page.goto("/account/display-name");
    await this.waitForPageLoad();
  }

  /**
   * Navigate to the set display name page with return URL.
   */
  async gotoWithReturnUrl(returnTo: string): Promise<void> {
    await this.page.goto(`/account/display-name?returnTo=${encodeURIComponent(returnTo)}`);
    await this.waitForPageLoad();
  }

  /**
   * Wait for the page to finish loading.
   */
  async waitForLoaded(): Promise<void> {
    await this.waitForVisible(this.pageContainer);
  }

  /**
   * Fill the display name input.
   */
  async fillDisplayName(displayName: string): Promise<void> {
    await this.fillInput(this.displayNameInput, displayName);
  }

  /**
   * Submit the form.
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Set display name - combines filling and submitting.
   */
  async setDisplayName(displayName: string): Promise<void> {
    await this.fillDisplayName(displayName);
    await this.submit();
  }

  /**
   * Wait for successful submission and redirect.
   * @param expectedUrl - URL to wait for after success (default: home page)
   */
  async waitForSuccess(expectedUrl = "/"): Promise<void> {
    await this.page.waitForURL(expectedUrl);
  }

  /**
   * Assert that the page is loaded and visible.
   */
  async expectPageVisible(): Promise<void> {
    await expect(this.pageContainer).toBeVisible();
    await expect(this.card).toBeVisible();
    await expect(this.pageTitle).toBeVisible();
    await expect(this.infoBanner).toBeVisible();
    await expect(this.form).toBeVisible();
  }

  /**
   * Assert that loading session state is displayed.
   */
  async expectLoadingSession(): Promise<void> {
    await expect(this.loadingSessionState).toBeVisible();
  }

  /**
   * Assert that loading profile state is displayed.
   */
  async expectLoadingProfile(): Promise<void> {
    await expect(this.loadingProfileState).toBeVisible();
  }

  /**
   * Assert that redirecting state is displayed.
   */
  async expectRedirecting(): Promise<void> {
    await expect(this.redirectingState).toBeVisible();
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
   * Assert that form error is displayed.
   */
  async expectFormError(message?: string): Promise<void> {
    await expect(this.formError).toBeVisible();
    if (message) {
      await expect(this.formError).toContainText(message);
    }
  }

  /**
   * Assert that field validation error is displayed.
   */
  async expectFieldError(message?: string): Promise<void> {
    await expect(this.fieldError).toBeVisible();
    if (message) {
      await expect(this.fieldError).toContainText(message);
    }
  }

  /**
   * Assert the character counter displays correct value.
   */
  async expectCharacterCount(current: number, max = 32): Promise<void> {
    await expect(this.characterCounter).toContainText(`${current}/${max}`);
  }

  /**
   * Get the current character count from the counter.
   */
  async getCharacterCount(): Promise<{ current: number; max: number }> {
    const text = (await this.characterCounter.textContent()) ?? "0/32";
    const [current, max] = text.split("/").map(Number);
    return { current, max };
  }

  /**
   * Clear the display name input.
   */
  async clearDisplayName(): Promise<void> {
    await this.displayNameInput.clear();
  }
}
