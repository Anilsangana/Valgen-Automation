"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeUserSignup = completeUserSignup;
exports.logoutAndNavigateToSignup = logoutAndNavigateToSignup;
const test_1 = require("@playwright/test");
const browser_1 = require("../../core/browser");
/**
 * Complete the signup process for a new user (Steps 1 & 2)
 */
async function completeUserSignup(page, user) {
    try {
        browser_1.automationEvents.emit('log', `Starting signup process for user: ${user.UserName}`);
        // Navigate to signup page
        browser_1.automationEvents.emit('log', `Navigating to Sign Up page for user: ${user.UserName}`);
        await page.getByRole('link', { name: 'Sign Up' }).click();
        await page.waitForLoadState('domcontentloaded');
        // ===================== FILL SIGNUP FORM - STEP 1 =====================
        await fillSignupStep1(page, user);
        // ===================== FILL SIGNUP FORM - STEP 2 =====================
        await fillSignupStep2(page, user);
        // Wait for redirect to login page
        browser_1.automationEvents.emit('log', `Signup completed successfully for user: ${user.UserName}, waiting for redirect to login page`);
        await page.waitForURL('https://vgusdev01.valgenesis.net/PIHEALTH-DEV/Login/Login.aspx');
        return { success: true, message: 'Signup completed successfully' };
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Signup failed for user ${user.UserName}: ${String(err)}`);
        return { success: false, message: String(err) };
    }
}
/**
 * Fill signup form - Step 1 (Username and Password)
 */
async function fillSignupStep1(page, user) {
    browser_1.automationEvents.emit('log', `Filling signup form - Step 1 for user: ${user.UserName}`);
    const textBox = page.locator('#txtUserName');
    await (0, test_1.expect)(textBox).toBeVisible();
    browser_1.automationEvents.emit('log', `Entering username: ${user.UserName}`);
    await textBox.fill(user.UserName);
    const password = page.locator('#txtPassword');
    browser_1.automationEvents.emit('log', `Entering password for user: ${user.UserName}`);
    await password.fill(user.Password);
    browser_1.automationEvents.emit('log', `Submitting step 1 of signup for user: ${user.UserName}`);
    await page.locator('#btnSubmit').click({ force: true, delay: 100 });
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('load');
    await page.waitForLoadState('domcontentloaded');
}
/**
 * Fill signup form - Step 2 (Personal Details)
 */
async function fillSignupStep2(page, user) {
    browser_1.automationEvents.emit('log', `Filling signup form - Step 2 (Personal Details) for user: ${user.UserName}`);
    const phNumber = page.locator('#txtPhoneNum');
    await (0, test_1.expect)(phNumber).toBeVisible();
    browser_1.automationEvents.emit('log', `Entering phone number for user: ${user.UserName}`);
    await phNumber.fill('98987676665');
    browser_1.automationEvents.emit('log', `Entering address for user: ${user.UserName}`);
    await page.locator('#txtAddress1').fill('1st lane, Hitech city, Hyderabad');
    browser_1.automationEvents.emit('log', `Setting passwords in step 2 for user: ${user.UserName}`);
    await page.locator('[name="txtPassword"]').fill(user.Password);
    await page.locator('[name="txtREPassword"]').fill(user.Password);
    browser_1.automationEvents.emit('log', `Saving signup form for user: ${user.UserName}`);
    await page.locator('#btnSave').click();
    browser_1.automationEvents.emit('log', `Waiting for signup success message for user: ${user.UserName}`);
    await (0, test_1.expect)(page.locator('#val1_lblCM')).toBeVisible();
    await page.locator('#val1_btnMessageOk').click();
}
/**
 * Logout and navigate to signup page
 */
async function logoutAndNavigateToSignup(page, username) {
    browser_1.automationEvents.emit('log', `Logging out to start signup process for user: ${username}`);
    await page.getByRole('link', { name: 'Logout' }).click();
    await page.waitForLoadState('networkidle');
}
