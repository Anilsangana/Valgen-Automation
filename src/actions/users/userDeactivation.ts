import { Page } from 'playwright';
import { expect } from '@playwright/test';
import { automationEvents } from '../../core/browser';
import { AdministrationPage } from '../../pages/administrationPage';

/**
 * Deactivate a user account
 */
export async function deactivateUser(
    page: Page,
    admin: AdministrationPage,
    username: string
): Promise<{ success: boolean; message: string }> {
    const deactivationFrame = page.frameLocator('#framecontent');
    try {
        automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        automationEvents.emit('log', `Starting user deactivation process for: ${username}`);
        automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        // Step 1: Navigate to Administration menu
        automationEvents.emit('log', `Step 1: Clicking on 'Administration' menu`);
        await page.getByRole('link', { name: ' Administration' }).click();
        await page.waitForLoadState('load');
        automationEvents.emit('log', `✓ Administration menu clicked`);

        // Step 2: Hover over Administration submenu
        automationEvents.emit('log', `Step 2: Hovering over Administration submenu`);
        await page.locator('#AD000', { hasText: 'Administration' }).hover();
        automationEvents.emit('log', `✓ Administration submenu visible`);

        // Step 3: Navigate to User Edit/Deactivate page
        automationEvents.emit('log', `Step 3: Clicking on 'User Edit, Deactivate, Reactivate or Terminate Users'`);
        await page.getByText('Edit, Deactivate, Reactivate or Terminate Users').click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        automationEvents.emit('log', `✓ User management page loaded`);

        // Step 4: Search for the user
        automationEvents.emit('log', `Step 4: Searching for user '${username}'`);
        await deactivationFrame.locator('#txtSrchuser').fill(username);
        automationEvents.emit('log', `✓ Username entered in search field`);

        await deactivationFrame.locator('#btnSearch').click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        automationEvents.emit('log', `✓ Search completed for user '${username}'`);

        // Step 5: Click on the user link
        automationEvents.emit('log', `Step 5: Opening user profile for '${username}'`);
        await deactivationFrame.getByRole('link', { name: username, exact: true }).click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        automationEvents.emit('log', `✓ User profile opened for '${username}'`);

        // Step 6: Click Deactivate option
        automationEvents.emit('log', `Step 6: Selecting 'Deactivate' option`);
        await deactivationFrame.locator('[for="rbtnDeactivate"]').click();
        // await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        automationEvents.emit('log', `✓ Deactivate option selected`);

        // Step 7: Fill deactivation comments
        automationEvents.emit('log', `Step 7: Adding deactivation comments`);
        await deactivationFrame.locator('#txtComments').pressSequentially(`${username} is deactivated by automation`);
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        automationEvents.emit('log', `✓ Comments added: '${username} is deactivated by automation'`);

        // Step 8: Submit deactivation
        automationEvents.emit('log', `Step 8: Submitting deactivation request`);
        await deactivationFrame.locator('#btnUpdate').click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        automationEvents.emit('log', `✓ Deactivation request submitted`);

        // Step 9: Confirm deactivation message
        automationEvents.emit('log', `Step 9: Confirming deactivation success message`);
        await deactivationFrame.locator('#btnMessageOk').click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        automationEvents.emit('log', `✓ Deactivation confirmation acknowledged`);

        automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        automationEvents.emit('log', `✅ User '${username}' deactivated successfully!`);
        automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        await page.getByRole('link', { name: 'Logout' }).click();

        return { success: true, message: 'User deactivated successfully' };
    } catch (err) {
        automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        automationEvents.emit('error', `❌ User deactivation failed for '${username}'`);
        automationEvents.emit('error', `Error details: ${String(err)}`);
        automationEvents.emit('log', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        return { success: false, message: String(err) };
    }
}
