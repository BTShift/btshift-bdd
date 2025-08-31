import { Page, Locator } from '@playwright/test';

export class LoginPage {
  private page: Page;
  private emailInput: Locator;
  private passwordInput: Locator;
  private signInButton: Locator;
  private errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"], input[type="email"]');
    this.passwordInput = page.locator('input[name="password"], input[type="password"]');
    this.signInButton = page.locator('button[type="submit"]:has-text("Sign In"), button:has-text("Login")');
    this.errorMessage = page.locator('[role="alert"], .error-message, .text-destructive');
  }

  async navigate(url?: string): Promise<void> {
    await this.page.goto(url || '/auth/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async waitForLoginSuccess(): Promise<void> {
    // Wait for navigation away from login page
    await this.page.waitForURL((url) => !url.pathname.includes('login'), {
      timeout: 10000,
    });
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 3000 });
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    // Check if we're on a dashboard or home page
    const url = this.page.url();
    return !url.includes('login') && !url.includes('auth');
  }
}