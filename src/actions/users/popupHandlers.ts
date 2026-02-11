import { Page, FrameLocator } from 'playwright';
import { automationEvents } from '../../core/browser';
import { waitForPostback } from '../../core/navigation';

/**
 * Submit user creation form
 */
export async function submitUserCreationForm(
    page: Page,
    frame: FrameLocator,
    userEmail: string
): Promise<void> {
    automationEvents.emit('log', `Submitting user: ${userEmail}`);
    await frame.locator('#btnUpdate').click();
    await waitForPostback(page, 10000); // Wait for submit postback
}

/**
 * Handle success popup
 */
export async function handleSuccessPopup(
    page: Page,
    frame: FrameLocator,
    userEmail: string
): Promise<void> {
    automationEvents.emit('log', `User created successfully: ${userEmail}`);
    await frame.locator('#btnMessageOk').click();
    await page.waitForLoadState('domcontentloaded');
}
