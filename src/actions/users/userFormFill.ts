import { Page, FrameLocator } from 'playwright';
import { automationEvents } from '../../core/browser';
import { waitForOverlayGone } from '../../core/navigation';

export interface UserFormData {
    FirstName: string;
    LastName: string;
    UserName: string;
    Email: string;
    Password: string;
    Role?: string;
    Department?: string;
    Comments?: string;
}

/**
 * Fill the user creation form in the admin panel
 */
export async function fillUserCreationForm(
    page: Page,
    frame: FrameLocator,
    user: UserFormData
): Promise<void> {
    automationEvents.emit('log', `Filling user creation form for: ${user.Email}`);

    // Select Role if provided
    if (user.Role) {
        await page.waitForLoadState('domcontentloaded');
        await frame.locator('#ddlRole').selectOption({ label: user.Role });
    } else {
        automationEvents.emit('log', 'No role specified, skipping role selection.');
    }
    await page.waitForTimeout(2000);
    await page.waitForLoadState('domcontentloaded');

    // Select Department if provided
    if (user.Department) {
        try {
            await frame.locator('#ddlDepartment').selectOption({ label: user.Department });
        } catch (err) {
            automationEvents.emit('error', `Department '${user.Department}' not found in dropdown, skipping department selection`);
        }
    }
    await page.waitForTimeout(1000);
    await page.waitForLoadState('domcontentloaded');

    // Fill First Name
    await frame.locator('#txtFirstName').fill(user.FirstName);
    automationEvents.emit('log', `Filled FirstName: ${user.FirstName}`);
    await page.waitForTimeout(500);

    // Fill Last Name
    await frame.locator('#txtLastName').fill(user.LastName);
    automationEvents.emit('log', `Filled LastName: ${user.LastName}`);
    await page.waitForTimeout(500);

    // Fill Username
    await frame.locator('#txtUserName').fill(user.UserName);
    automationEvents.emit('log', `Filled UserName: ${user.UserName}`);
    await page.waitForTimeout(500);

    // Fill Email
    await frame.locator('#txtEmail').fill(user.Email);
    automationEvents.emit('log', `Filled Email: ${user.Email}`);
    await page.waitForTimeout(500);

    // Fill Re-enter Email
    await frame.locator('#txtREEmail').fill(user.Email);
    automationEvents.emit('log', `Filled Re-enter Email: ${user.Email}`);
    await page.waitForTimeout(500);

    // Fill Password
    await frame.locator('#txtPwd').fill(user.Password);
    automationEvents.emit('log', `Filled Password: ${user.Password}`);
    await page.waitForTimeout(500);

    // Fill Re-enter Password
    await frame.locator('#txtRPwd').fill(user.Password);
    automationEvents.emit('log', `Filled Re-enter Password: ${user.Password}`);
    await page.waitForTimeout(500);

    // Fill Comments if provided
    if (user.Comments) {
        await frame.locator('#txtComments').fill(user.Comments);
    }

    automationEvents.emit('log', `User creation form filled successfully for: ${user.Email}`);
}

/**
 * Navigate to user creation page
 */
export async function navigateToUserCreateForm(page: Page): Promise<FrameLocator> {
    await waitForOverlayGone(page);

    const frame = page.frameLocator('#framecontent');

    await frame.locator('#liCreateUser').click().catch(() => { });
    await frame.locator('#divCreateUser').waitFor({ state: 'visible' });

    return frame;
}
