"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginPage = void 0;
class LoginPage {
    constructor(page, baseUrl) {
        this.page = page;
        this.url = baseUrl;
        this.usernameInput = page.locator('#txtUserName');
        this.passwordInput = page.locator('#txtPassword');
        this.loginButton = page.locator('#btnSubmit');
    }
    async navigate() {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
    }
    async login(username, password) {
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
        await this.page.waitForLoadState('networkidle');
        if (await this.page.getByRole('link', { name: 'ok' }).isVisible()) {
            await this.page.getByRole('link', { name: 'ok' }).click();
        }
    }
    async loginWithNewUser(username, password) {
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
exports.LoginPage = LoginPage;
