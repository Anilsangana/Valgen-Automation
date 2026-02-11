import { Page, FrameLocator } from 'playwright';
import { automationEvents } from '../../core/browser';
import { UserFormData } from './userFormFill';

export type DuplicateStrategy = 'skip' | 'append' | 'stop';

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    isSuccess: boolean;
    message?: string;
}

/**
 * Check for duplicate or success popup after user submission
 */
export async function checkForDuplicateOrSuccess(
    page: Page,
    frame: FrameLocator,
    userEmail: string
): Promise<DuplicateCheckResult> {
    automationEvents.emit('log', 'Waiting for success or duplicate popup...');

    const duplicatePopup = frame.locator('#val1_lblErrorAlert');
    const successPopup = frame.locator('#val1_lblCM');

    // Wait a bit for any popup to appear
    await page.waitForTimeout(2000);

    // Debug: Check what elements are visible
    try {
        const successVisible = await successPopup.isVisible();
        const duplicateVisible = await duplicatePopup.isVisible();
        automationEvents.emit('log', `Debug - Success popup visible: ${successVisible}, Duplicate popup visible: ${duplicateVisible}`);
    } catch (err) {
        automationEvents.emit('log', `Debug - Error checking visibility: ${String(err)}`);
    }

    // Check for success popup first (more common case)
    const successDetected = await detectSuccessPopup(frame, userEmail);

    if (successDetected) {
        return { isDuplicate: false, isSuccess: true };
    }

    // If no success popup, check for duplicate popup
    const duplicateDetected = await detectDuplicatePopup(frame, duplicatePopup, userEmail);

    if (duplicateDetected) {
        const msg = (await duplicatePopup.innerText()).trim();
        return { isDuplicate: true, isSuccess: false, message: msg };
    }

    // No popup detected
    automationEvents.emit('error', `No popup detected for user: ${userEmail}`);
    return { isDuplicate: false, isSuccess: false, message: 'No success or duplicate popup detected' };
}

/**
 * Detect success popup using multiple selectors
 */
async function detectSuccessPopup(frame: FrameLocator, userEmail: string): Promise<boolean> {
    let successDetected = false;

    // Try multiple possible success popup selectors
    const successSelectors = [
        '#val1_lblSuccessAlert',
        '#val1_lblCM'
    ];

    for (const selector of successSelectors) {
        try {
            const popup = frame.locator(selector);
            await popup.waitFor({ state: 'visible', timeout: 3000 });
            successDetected = true;
            automationEvents.emit('log', `Success popup detected using selector: ${selector} for user: ${userEmail}`);
            break;
        } catch (err) {
            // Try next selector
        }
    }

    // If still not found, try a more general approach
    if (!successDetected) {
        try {
            const allPopups = frame.locator('[id*="popup"], [id*="Popup"], [id*="alert"], [id*="Alert"], [id*="message"], [id*="Message"]');
            const count = await allPopups.count();
            automationEvents.emit('log', `Found ${count} potential popup elements`);

            for (let i = 0; i < count; i++) {
                const popup = allPopups.nth(i);
                if (await popup.isVisible()) {
                    const text = await popup.innerText();
                    automationEvents.emit('log', `Found visible popup with text: ${text}`);
                    if (text.toLowerCase().includes('success') || text.toLowerCase().includes('created') || text.toLowerCase().includes('saved')) {
                        successDetected = true;
                        automationEvents.emit('log', `Success detected from popup text for user: ${userEmail}`);
                        break;
                    }
                }
            }
        } catch (err) {
            automationEvents.emit('log', `General popup search failed: ${String(err)}`);
        }
    }

    if (!successDetected) {
        automationEvents.emit('log', `Success popup not found with any selector for user: ${userEmail}`);
    }

    return successDetected;
}

/**
 * Detect duplicate popup
 */
async function detectDuplicatePopup(
    frame: FrameLocator,
    duplicatePopup: any,
    userEmail: string
): Promise<boolean> {
    try {
        await duplicatePopup.waitFor({ state: 'visible', timeout: 10000 });
        automationEvents.emit('log', `Duplicate popup detected for user: ${userEmail}`);
        return true;
    } catch (err) {
        automationEvents.emit('log', `Duplicate popup not found within timeout: ${String(err)}`);
        return false;
    }
}

/**
 * Handle duplicate user by clicking OK button
 */
export async function handleDuplicatePopup(frame: FrameLocator): Promise<void> {
    const duplicateOkBtn = frame.locator('#val1_btnerrorok');
    await duplicateOkBtn.click().catch(() => { });
}

/**
 * Generate modified user data with appended suffix
 */
export function generateModifiedUser(user: UserFormData): { newUser: string; newEmail: string } {
    const suffix = Date.now().toString().slice(-4);
    const newUser = `${user.UserName}_${suffix}`;
    const newEmail = user.Email.replace('@', `_${suffix}@`);

    return { newUser, newEmail };
}

/**
 * Retry user creation with modified credentials
 */
export async function retryWithModifiedCredentials(
    page: Page,
    frame: FrameLocator,
    user: UserFormData
): Promise<{ newUser: string; newEmail: string }> {
    const { newUser, newEmail } = generateModifiedUser(user);

    automationEvents.emit('log', `Retrying with ${newEmail}`);

    await frame.locator('#txtUserName').fill(newUser);
    await frame.locator('#txtEmail').fill(newEmail);
    await frame.locator('#txtREEmail').fill(newEmail);
    await frame.locator('#btnUpdate').click();

    const successPopup = frame.locator('#val1_lblCM');
    await successPopup.waitFor({ state: 'visible', timeout: 8000 });
    await frame.locator('#btnMessageOk').click().catch(() => { });

    return { newUser, newEmail };
}
