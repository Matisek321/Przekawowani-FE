import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for the Register page.
 * Handles user registration flow.
 */
export class RegisterPage extends BasePage {
  // Form container
  readonly form: Locator;
  readonly formElement: Locator;

  // Input fields
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;

  // Buttons
  readonly submitButton: Locator;

  // Links
  readonly loginLink: Locator;
  readonly successLoginLink: Locator;

  // Error messages
  readonly formError: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly confirmPasswordError: Locator;

  // Success state
  readonly successContainer: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Form container
    this.form = this.getByTestId("register-form");
    this.formElement = this.getByTestId("register-form-element");

    // Input fields
    this.emailInput = this.getByTestId("register-email-input");
    this.passwordInput = this.getByTestId("register-password-input");
    this.confirmPasswordInput = this.getByTestId("register-confirm-password-input");

    // Buttons
    this.submitButton = this.getByTestId("register-submit-button");

    // Links
    this.loginLink = this.getByTestId("register-login-link");
    this.successLoginLink = this.getByTestId("register-success-login-link");

    // Error messages
    this.formError = this.getByTestId("register-form-error");
    this.emailError = this.getByTestId("register-email-error");
    this.passwordError = this.getByTestId("register-password-error");
    this.confirmPasswordError = this.getByTestId("register-confirm-password-error");

    // Success state
    this.successContainer = this.getByTestId("register-success");
    this.successMessage = this.getByTestId("register-success-message");
  }

  /**
   * Navigate to the register page.
   */
  async goto(): Promise<void> {
    await this.page.goto("/auth/register");
    await this.waitForPageLoad();
  }

  /**
   * Fill the registration form with provided data.
   */
  async fillForm(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.fillInput(this.confirmPasswordInput, confirmPassword ?? password);
  }

  /**
   * Submit the registration form.
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Register a new user with provided credentials.
   * Combines filling form and submitting.
   */
  async register(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.fillForm(email, password, confirmPassword);
    await this.submit();
  }

  /**
   * Wait for successful registration.
   */
  async waitForSuccess(): Promise<void> {
    await this.waitForVisible(this.successContainer);
  }

  /**
   * Assert that registration was successful.
   */
  async expectSuccess(): Promise<void> {
    await expect(this.successContainer).toBeVisible();
    await expect(this.successMessage).toBeVisible();
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
   * Assert that confirm password validation error is displayed.
   */
  async expectConfirmPasswordError(message?: string): Promise<void> {
    await expect(this.confirmPasswordError).toBeVisible();
    if (message) {
      await expect(this.confirmPasswordError).toContainText(message);
    }
  }

  /**
   * Navigate to login page via link.
   */
  async goToLogin(): Promise<void> {
    await Promise.all([this.page.waitForURL(/login/), this.loginLink.click()]);
  }

  /**
   * Navigate to login page via success link.
   */
  async goToLoginAfterSuccess(): Promise<void> {
    await this.successLoginLink.click();
    await this.page.waitForURL(/login/);
  }
}
