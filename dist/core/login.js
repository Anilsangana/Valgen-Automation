"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const browser_1 = require("./browser");
const loginPage_1 = require("../pages/loginPage");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const STORAGE_PATH = path_1.default.join(process.cwd(), 'auth', 'vg-storage.json');
async function login(page, baseUrl, username, password) {
    try {
        // ===================== REUSE SESSION =====================
        if (fs_1.default.existsSync(STORAGE_PATH)) {
            browser_1.automationEvents.emit('log', 'Found existing storageState → validating session');
            await page.goto(baseUrl.replace(/login\/login\.aspx.*/i, 'default.aspx'), {
                waitUntil: 'domcontentloaded',
            });
            const loggedIn = await page
                .getByRole('link', { name: 'Administration' })
                .isVisible()
                .catch(() => false);
            if (loggedIn) {
                browser_1.automationEvents.emit('log', 'Session valid → skipping login');
                return { success: true, message: 'Reused existing session' };
            }
            browser_1.automationEvents.emit('log', 'Session expired → performing fresh login');
        }
        // ===================== FRESH LOGIN =====================
        browser_1.automationEvents.emit('log', `Navigating to login page: ${baseUrl}`);
        const loginPage = new loginPage_1.LoginPage(page, baseUrl);
        await loginPage.navigate();
        await page.waitForLoadState('domcontentloaded');
        browser_1.automationEvents.emit('log', 'Filling credentials and logging in...');
        await loginPage.login(username, password);
        // VG 4.2 is slow → be generous
        browser_1.automationEvents.emit('log', 'Waiting for home page after login...');
        await Promise.race([
            page.waitForURL(/default\.aspx/i, { timeout: 35000 }),
            page.getByRole('link', { name: 'Administration' }).waitFor({ timeout: 35000 }),
        ]);
        // ===================== SAVE STORAGE STATE =====================
        await page.context().storageState({ path: STORAGE_PATH });
        browser_1.automationEvents.emit('log', `storageState saved → ${STORAGE_PATH}`);
        browser_1.automationEvents.emit('log', 'Login successful');
        return { success: true, message: 'Logged in and session saved' };
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Login failed or timed out. URL: ${page.url()} | Error: ${String(err)}`);
        return { success: false, message: String(err) };
    }
}
