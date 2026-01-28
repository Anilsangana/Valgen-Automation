"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForPostback = waitForPostback;
exports.waitForOverlayGone = waitForOverlayGone;
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
async function waitForOverlayGone(page, overlaySelector = '.loading-overlay, .blockUI', timeout = 30000) {
    try {
        await page.waitForSelector(overlaySelector, { state: 'hidden', timeout });
    }
    catch (err) {
        // it's okay if overlay not found
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
