import { Page } from 'playwright';
import { expect } from '@playwright/test';
import { automationEvents } from '../../core/browser';
import { AdministrationPage } from '../../pages/administrationPage';

/**
 * Activate a user account (admin approval process)
 */
export async function activateUser(
    page: Page,
    admin: AdministrationPage,
    username: string
): Promise<{ success: boolean; message: string }> {
    try {
        automationEvents.emit('log', `Starting user activation process for: ${username}`);

        // Navigate to User Management page
        automationEvents.emit('log', `Navigating to User Management page to activate user: ${username}`);
        await admin.navigateToUserCreate();

        // Create fresh frame locator after navigation
        const activationFrame = page.frameLocator('#framecontent');

        // Click on 'Activate User' tab
        automationEvents.emit('log', `Clicking on 'Activate User' tab for user: ${username}`);
        await activationFrame.locator('#lblActivateUser').click();
        await page.waitForLoadState('domcontentloaded');

        // Search for user in activation table
        automationEvents.emit('log', `Searching for user ${username} in the activation table`);
        const row = activationFrame.locator('#grvADS tr').filter({ hasText: username });
        await expect(row).toBeVisible();

        // Select checkbox to activate
        automationEvents.emit('log', `Found user ${username}, selecting checkbox to activate`);
        const checkbox = row.locator('input[type="checkbox"]');
        await checkbox.check();

        // Submit activation request
        automationEvents.emit('log', `Submitting activation request for user: ${username}`);
        await activationFrame.locator('#btnAdsSubmit').click();

        // Wait for confirmation
        automationEvents.emit('log', `Waiting for activation confirmation for user: ${username}`);
        await expect(activationFrame.locator('#val1_lblCM', { hasText: '   User Account has been activated' })).toBeVisible();
        automationEvents.emit('log', `✓ User ${username} activated successfully!`);

        await activationFrame.locator('#btnMessageOk').click();
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');

        return { success: true, message: 'User activated successfully' };
    } catch (err) {
        automationEvents.emit('error', `User activation failed for ${username}: ${String(err)}`);
        return { success: false, message: String(err) };
    }
}
