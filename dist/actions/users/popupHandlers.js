"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitUserCreationForm = submitUserCreationForm;
exports.handleSuccessPopup = handleSuccessPopup;
const browser_1 = require("../../core/browser");
const navigation_1 = require("../../core/navigation");
/**
 * Submit user creation form
 */
async function submitUserCreationForm(page, frame, userEmail) {
    browser_1.automationEvents.emit('log', `Submitting user: ${userEmail}`);
    await frame.locator('#btnUpdate').click();
    await (0, navigation_1.waitForPostback)(page, 10000); // Wait for submit postback
}
/**
 * Handle success popup
 */
async function handleSuccessPopup(page, frame, userEmail) {
    browser_1.automationEvents.emit('log', `User created successfully: ${userEmail}`);
    await frame.locator('#btnMessageOk').click();
    await page.waitForLoadState('domcontentloaded');
}
