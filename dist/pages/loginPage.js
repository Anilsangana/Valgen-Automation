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
    }
}
exports.LoginPage = LoginPage;
