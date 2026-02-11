"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateUser = deactivateUser;
const browser_1 = require("../../core/browser");
/**
 * Deactivate a user account
 */
async function deactivateUser(page, admin, username) {
    const deactivationFrame = page.frameLocator('#framecontent');
    try {
        browser_1.automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        browser_1.automationEvents.emit('log', `Starting user deactivation process for: ${username}`);
        browser_1.automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        // Step 1: Navigate to Administration menu
        browser_1.automationEvents.emit('log', `Step 1: Clicking on 'Administration' menu`);
        await page.getByRole('link', { name: ' Administration' }).click();
        await page.waitForLoadState('load');
        browser_1.automationEvents.emit('log', `✓ Administration menu clicked`);
        // Step 2: Hover over Administration submenu
        browser_1.automationEvents.emit('log', `Step 2: Hovering over Administration submenu`);
        await page.locator('#AD000', { hasText: 'Administration' }).hover();
        browser_1.automationEvents.emit('log', `✓ Administration submenu visible`);
        // Step 3: Navigate to User Edit/Deactivate page
        browser_1.automationEvents.emit('log', `Step 3: Clicking on 'User Edit, Deactivate, Reactivate or Terminate Users'`);
        await page.getByText('Edit, Deactivate, Reactivate or Terminate Users').click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        browser_1.automationEvents.emit('log', `✓ User management page loaded`);
        // Step 4: Search for the user
        browser_1.automationEvents.emit('log', `Step 4: Searching for user '${username}'`);
        await deactivationFrame.locator('#txtSrchuser').fill(username);
        browser_1.automationEvents.emit('log', `✓ Username entered in search field`);
        await deactivationFrame.locator('#btnSearch').click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        browser_1.automationEvents.emit('log', `✓ Search completed for user '${username}'`);
        // Step 5: Click on the user link
        browser_1.automationEvents.emit('log', `Step 5: Opening user profile for '${username}'`);
        await deactivationFrame.getByRole('link', { name: username, exact: true }).click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        browser_1.automationEvents.emit('log', `✓ User profile opened for '${username}'`);
        // Step 6: Click Deactivate option
        browser_1.automationEvents.emit('log', `Step 6: Selecting 'Deactivate' option`);
        await deactivationFrame.locator('[for="rbtnDeactivate"]').click();
        // await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        browser_1.automationEvents.emit('log', `✓ Deactivate option selected`);
        // Step 7: Fill deactivation comments
        browser_1.automationEvents.emit('log', `Step 7: Adding deactivation comments`);
        await deactivationFrame.locator('#txtComments').pressSequentially(`${username} is deactivated by automation`);
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        browser_1.automationEvents.emit('log', `✓ Comments added: '${username} is deactivated by automation'`);
        // Step 8: Submit deactivation
        browser_1.automationEvents.emit('log', `Step 8: Submitting deactivation request`);
        await deactivationFrame.locator('#btnUpdate').click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        browser_1.automationEvents.emit('log', `✓ Deactivation request submitted`);
        // Step 9: Confirm deactivation message
        browser_1.automationEvents.emit('log', `Step 9: Confirming deactivation success message`);
        await deactivationFrame.locator('#btnMessageOk').click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        browser_1.automationEvents.emit('log', `✓ Deactivation confirmation acknowledged`);
        browser_1.automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        browser_1.automationEvents.emit('log', `✅ User '${username}' deactivated successfully!`);
        browser_1.automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        await page.getByRole('link', { name: 'Logout' }).click();
        return { success: true, message: 'User deactivated successfully' };
    }
    catch (err) {
        browser_1.automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        browser_1.automationEvents.emit('error', `❌ User deactivation failed for '${username}'`);
        browser_1.automationEvents.emit('error', `Error details: ${String(err)}`);
        browser_1.automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        return { success: false, message: String(err) };
    }
}
