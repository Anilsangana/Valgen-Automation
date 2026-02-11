import { Page, Locator } from 'playwright';

export class LoginPage {
  readonly url: string;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly page: Page;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.url = baseUrl;
    this.usernameInput = page.locator('#txtUserName');
    this.passwordInput = page.locator('#txtPassword');
    this.loginButton = page.locator('#btnSubmit');
  }

  async navigate() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForLoadState('networkidle');
    if (await this.page.getByRole('link', { name: 'ok' }).isVisible()) {
      await this.page.getByRole('link', { name: 'ok' }).click();
    }
  }

  async loginWithNewUser(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.page.locator('[name="ddlSetTimeZone"]').selectOption('(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi');
    await this.loginButton.click();
    await this.page.waitForLoadState('networkidle');
    if (await this.page.getByRole('link', { name: 'ok' }).isVisible()) {
      await this.page.getByRole('link', { name: 'ok' }).click();
    }
  }
}
