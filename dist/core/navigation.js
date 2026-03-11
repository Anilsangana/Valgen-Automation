"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForPostback = waitForPostback;
exports.waitForOverlayGone = waitForOverlayGone;
exports.waitForIframeLoaderGone = waitForIframeLoaderGone;
exports.switchToIframeIfPresent = switchToIframeIfPresent;
exports.retry = retry;
const browser_1 = require("./browser");
async function waitForPostback(page, timeout = 30000) {
    // ASP.NET often does full postbacks. Wait for DOMContentLoaded or network idle.
    try {
        await page.waitForLoadState('load', { timeout });
        // extra wait for overlays
        await page.waitForTimeout(500);
    }
    catch (err) {
        browser_1.automationEvents.emit('log', `waitForPostback timeout or error: ${String(err)}`);
    }
}
/**
 * Wait for the main page-level Ajax overlay to disappear.
 * Targets the exact loaders found in ValGenesis (inspected live):
 *   - .Ajaxloading          — full-page dimmer during postbacks
 *   - .Ajaxloading-bg       — dark background behind the spinner
 *   - #imgPgrss             — the spinning progress image (z-index: max)
 *   - #spMPB_backgroundElement.loading-bg — modal-panel loader background
 */
async function waitForOverlayGone(page, timeout = 20000) {
    const overlaySelectors = [
        '.Ajaxloading',
        '.Ajaxloading-bg',
        '#imgPgrss',
        '#spMPB_backgroundElement',
        '#divLoadingSearchLib',
    ];
    for (const selector of overlaySelectors) {
        try {
            await page.waitForSelector(selector, { state: 'hidden', timeout });
        }
        catch {
            // OK if overlay not found — it means it's already gone
        }
    }
}
/**
 * Wait for DevExpress list-box loaders inside the iframe to disappear.
 * These appear when group type is selected and users are being loaded.
 *   - .dxlp-loadingImage   — DevExpress listbox loading spinner
 *   - #lboxAvilableUser_LD — Available Users listbox loading div
 *   - #lboxAssignedUser_LD — Assigned Users listbox loading div
 */
async function waitForIframeLoaderGone(page, timeout = 20000) {
    const frame = page.frameLocator('#framecontent');
    const loaderSelectors = [
        '#lboxAvilableUser_LD',
        '#lboxAssignedUser_LD',
        '.dxlp-loadingImage',
    ];
    for (const selector of loaderSelectors) {
        try {
            await frame.locator(selector).waitFor({ state: 'hidden', timeout });
        }
        catch {
            // OK if not found
        }
    }
}
async function switchToIframeIfPresent(page, iframeSelector) {
    const frameElem = await page.$(iframeSelector);
    if (!frameElem)
        return null;
    const frame = await frameElem.contentFrame();
    return frame || null;
}
async function retry(fn, retries = 3, delay = 1000) {
    let lastErr;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        }
        catch (err) {
            lastErr = err;
            browser_1.automationEvents.emit('log', `Retry ${i + 1} failed: ${String(err)}`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw lastErr;
}
