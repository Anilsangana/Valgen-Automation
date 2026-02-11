"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dismissTimeoutPopup = dismissTimeoutPopup;
exports.keepSessionAlive = keepSessionAlive;
const browser_1 = require("./browser");
/**
 * Detects and dismisses the ValGenesis session timeout warning popup.
 * This should be called periodically during long-running operations.
 */
async function dismissTimeoutPopup(page) {
    try {
        browser_1.automationEvents.emit('log', '🔍 Checking for session timeout popup...');
        // Check if the timeout text is visible
        const timeoutTextVisible = await page.locator('text=/Your Session will timeout/i').isVisible({ timeout: 500 }).catch(() => false);
        if (!timeoutTextVisible) {
            return false;
        }
        browser_1.automationEvents.emit('log', '⚠️ Session timeout popup DETECTED!');
        // Try multiple click strategies on the Activate button
        const activateSelectors = [
            'button:has-text("Activate")',
            'text=Activate',
            'input[value="Activate"]'
        ];
        for (const selector of activateSelectors) {
            try {
                const btn = page.locator(selector);
                const isVisible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
                if (isVisible) {
                    browser_1.automationEvents.emit('log', `Found button: ${selector}`);
                    // Strategy 1: Force click (bypasses visibility checks)
                    browser_1.automationEvents.emit('log', 'Trying force click...');
                    await btn.click({ force: true, timeout: 2000 });
                    await page.waitForTimeout(1500);
                    const gone = !(await page.locator('text=/Your Session will timeout/i').isVisible({ timeout: 500 }).catch(() => false));
                    if (gone) {
                        browser_1.automationEvents.emit('log', '✅ SUCCESS: Popup dismissed!');
                        return true;
                    }
                    // Strategy 2: JavaScript click
                    browser_1.automationEvents.emit('log', 'Trying JavaScript click...');
                    await btn.evaluate((el) => el.click());
                    await page.waitForTimeout(1500);
                    const gone2 = !(await page.locator('text=/Your Session will timeout/i').isVisible({ timeout: 500 }).catch(() => false));
                    if (gone2) {
                        browser_1.automationEvents.emit('log', '✅ SUCCESS: Popup dismissed via JS!');
                        return true;
                    }
                }
            }
            catch (err) {
                browser_1.automationEvents.emit('log', `Failed with ${selector}: ${String(err)}`);
            }
        }
        // Last resort: Press Enter
        browser_1.automationEvents.emit('log', 'Last resort: Pressing Enter key...');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);
        const goneEnter = !(await page.locator('text=/Your Session will timeout/i').isVisible({ timeout: 500 }).catch(() => false));
        if (goneEnter) {
            browser_1.automationEvents.emit('log', '✅ SUCCESS: Popup dismissed via Enter!');
            return true;
        }
        browser_1.automationEvents.emit('log', '❌ WARNING: Could not dismiss popup automatically');
        return false;
    }
    catch (err) {
        browser_1.automationEvents.emit('log', `Error in dismissTimeoutPopup: ${String(err)}`);
        return false;
    }
}
/**
 * Keeps the session alive by periodically checking for and dismissing timeout popups.
 * Call this in long-running operations.
 */
async function keepSessionAlive(page) {
    await dismissTimeoutPopup(page);
    // Also perform a small interaction to reset the timeout
    try {
        await page.mouse.move(100, 100);
    }
    catch (err) {
        // Ignore errors
    }
}
