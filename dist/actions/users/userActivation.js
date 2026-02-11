"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateUser = activateUser;
const test_1 = require("@playwright/test");
const browser_1 = require("../../core/browser");
/**
 * Activate a user account (admin approval process)
 */
async function activateUser(page, admin, username) {
    try {
        browser_1.automationEvents.emit('log', `Starting user activation process for: ${username}`);
        // Navigate to User Management page
        browser_1.automationEvents.emit('log', `Navigating to User Management page to activate user: ${username}`);
        await admin.navigateToUserCreate();
        // Create fresh frame locator after navigation
        const activationFrame = page.frameLocator('#framecontent');
        // Click on 'Activate User' tab
        browser_1.automationEvents.emit('log', `Clicking on 'Activate User' tab for user: ${username}`);
        await activationFrame.locator('#lblActivateUser').click();
        await page.waitForLoadState('domcontentloaded');
        // Search for user in activation table
        browser_1.automationEvents.emit('log', `Searching for user ${username} in the activation table`);
        const row = activationFrame.locator('#grvADS tr').filter({ hasText: username });
        await (0, test_1.expect)(row).toBeVisible();
        // Select checkbox to activate
        browser_1.automationEvents.emit('log', `Found user ${username}, selecting checkbox to activate`);
        const checkbox = row.locator('input[type="checkbox"]');
        await checkbox.check();
        // Submit activation request
        browser_1.automationEvents.emit('log', `Submitting activation request for user: ${username}`);
        await activationFrame.locator('#btnAdsSubmit').click();
        // Wait for confirmation
        browser_1.automationEvents.emit('log', `Waiting for activation confirmation for user: ${username}`);
        await (0, test_1.expect)(activationFrame.locator('#val1_lblCM', { hasText: '   User Account has been activated' })).toBeVisible();
        browser_1.automationEvents.emit('log', `✓ User ${username} activated successfully!`);
        await activationFrame.locator('#btnMessageOk').click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        return { success: true, message: 'User activated successfully' };
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `User activation failed for ${username}: ${String(err)}`);
        return { success: false, message: String(err) };
    }
}
