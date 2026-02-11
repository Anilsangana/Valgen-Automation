"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUserLogin = verifyUserLogin;
exports.logoutAfterVerification = logoutAfterVerification;
const browser_1 = require("../../core/browser");
const login_1 = require("../../core/login");
/**
 * Verify that a newly created user can login successfully
 */
async function verifyUserLogin(page, baseUrl, username, password) {
    try {
        browser_1.automationEvents.emit('log', `Verifying login for newly created user: ${username}`);
        // Logout current user
        browser_1.automationEvents.emit('log', `Logging out admin to verify new user login for: ${username}`);
        try {
            await page.getByRole('link', { name: 'Logout' }).click();
            await page.waitForLoadState('domcontentloaded');
            // Wait for logout to complete fully
            await page.waitForTimeout(2000);
            browser_1.automationEvents.emit('log', 'Logout completed, waiting for page to stabilize...');
        }
        catch (logoutErr) {
            browser_1.automationEvents.emit('log', `Logout click failed (may already be logged out): ${String(logoutErr)}`);
        }
        // Wait for any redirects or page transitions to complete
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
            browser_1.automationEvents.emit('log', 'Network idle timeout, continuing anyway...');
        });
        // Attempt to login with new user
        browser_1.automationEvents.emit('log', `Attempting to login with newly created user: ${username}`);
        const userLoginResult = await (0, login_1.loginWithNewUser)(page, baseUrl, username, password);
        if (userLoginResult.success) {
            browser_1.automationEvents.emit('log', `✓ New user ${username} logged in successfully! User creation process complete.`);
            return {
                success: true,
                message: 'User login verified successfully',
                loginVerified: true
            };
        }
        else {
            browser_1.automationEvents.emit('error', `✗ New user ${username} login failed after activation: ${userLoginResult.message}`);
            return {
                success: false,
                message: userLoginResult.message,
                loginVerified: false
            };
        }
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `User verification failed for ${username}: ${String(err)}`);
        return {
            success: false,
            message: String(err),
            loginVerified: false
        };
    }
}
/**
 * Logout after verification - safely handles already logged out state
 */
async function logoutAfterVerification(page) {
    try {
        // Check if logout button is visible (user is logged in)
        const logoutButton = page.getByRole('link', { name: 'Logout' });
        const isLoggedIn = await logoutButton.isVisible().catch(() => false);
        if (isLoggedIn) {
            await logoutButton.click();
            await page.waitForLoadState('domcontentloaded');
            browser_1.automationEvents.emit('log', 'Logged out after user verification');
        }
        else {
            browser_1.automationEvents.emit('log', 'User already logged out, skipping logout');
        }
    }
    catch (err) {
        browser_1.automationEvents.emit('log', `Logout after verification: ${String(err)}`);
    }
}
