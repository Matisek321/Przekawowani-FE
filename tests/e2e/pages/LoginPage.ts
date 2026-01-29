import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for the Login page.
 * Handles user authentication flow.
 */
export class LoginPage extends BasePage {
  // Form container
  readonly form: Locator;
  readonly formElement: Locator;

  // Input fields
  readonly emailInput: Locator;
  readonly passwordInput: Locator;

  // Buttons
  readonly submitButton: Locator;

  // Links
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  // Error messages
  readonly formError: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;

  constructor(page: Page) {
    super(page);

    // Form container
    this.form = this.getByTestId("login-form");
    this.formElement = this.getByTestId("login-form-element");

    // Input fields
    this.emailInput = this.getByTestId("login-email-input");
    this.passwordInput = this.getByTestId("login-password-input");

    // Buttons
    this.submitButton = this.getByTestId("login-submit-button");

    // Links
    this.forgotPasswordLink = this.getByTestId("login-forgot-password-link");
    this.registerLink = this.getByTestId("login-register-link");

    // Error messages
    this.formError = this.getByTestId("login-form-error");
    this.emailError = this.getByTestId("login-email-error");
    this.passwordError = this.getByTestId("login-password-error");
  }

  /**
   * Navigate to the login page.
   */
  async goto(): Promise<void> {
    await this.page.goto("/login");
    await this.waitForPageLoad();
  }

  /**
   * Navigate to login page with return URL.
   */
  async gotoWithReturnUrl(returnTo: string): Promise<void> {
    await this.page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    await this.waitForPageLoad();
  }

  /**
   * Fill the login form with provided credentials.
   */
  async fillForm(email: string, password: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
  }

  /**
   * Submit the login form.
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Login with provided credentials.
   * Combines filling form and submitting.
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillForm(email, password);
    await this.submit();
  }

  /**
   * Wait for successful login redirect.
   * @param expectedUrl - URL to wait for after login (default: home page)
   */
  async waitForLoginSuccess(expectedUrl = "/"): Promise<void> {
    await this.page.waitForURL(expectedUrl);
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
   * Assert that email validation error is displayed.
   */
  async expectEmailError(message?: string): Promise<void> {
    await expect(this.emailError).toBeVisible();
    if (message) {
      await expect(this.emailError).toContainText(message);
    }
  }

  /**
   * Assert that password validation error is displayed.
   */
  async expectPasswordError(message?: string): Promise<void> {
    await expect(this.passwordError).toBeVisible();
    if (message) {
      await expect(this.passwordError).toContainText(message);
    }
  }

  /**
   * Navigate to register page via link.
   */
  async goToRegister(): Promise<void> {
    await Promise.all([this.page.waitForURL(/register/), this.registerLink.click()]);
  }

  /**
   * Navigate to forgot password page via link.
   */
  async goToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.page.waitForURL(/forgot-password/);
  }

  /**
   * Assert that the login form is visible.
   */
  async expectFormVisible(): Promise<void> {
    await expect(this.form).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }
}
