"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForSelectorSafe = waitForSelectorSafe;
exports.clickAndWait = clickAndWait;
const browser_1 = require("../core/browser");
async function waitForSelectorSafe(page, selector, timeout = 15000) {
    try {
        await page.waitForSelector(selector, { state: 'visible', timeout });
    }
    catch (err) {
        browser_1.automationEvents.emit('log', `waitForSelectorSafe timeout for ${selector}`);
        throw err;
    }
}
async function clickAndWait(page, selector) {
    await Promise.all([page.waitForLoadState('load'), page.click(selector)]);
}
