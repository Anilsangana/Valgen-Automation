import { Page } from 'playwright';
import { expect } from '@playwright/test';
import { automationEvents } from '../../core/browser';
import { UserFormData } from './userFormFill';

/**
 * Complete the signup process for a new user (Steps 1 & 2)
 */
export async function completeUserSignup(
    page: Page,
    user: UserFormData
): Promise<{ success: boolean; message: string }> {
    try {
        automationEvents.emit('log', `Starting signup process for user: ${user.UserName}`);

        // Navigate to signup page
        automationEvents.emit('log', `Navigating to Sign Up page for user: ${user.UserName}`);
        await page.getByRole('link', { name: 'Sign Up' }).click();
        await page.waitForLoadState('domcontentloaded');

        // ===================== FILL SIGNUP FORM - STEP 1 =====================
        await fillSignupStep1(page, user);

        // ===================== FILL SIGNUP FORM - STEP 2 =====================
        await fillSignupStep2(page, user);

        // Wait for redirect to login page
        automationEvents.emit('log', `Signup completed successfully for user: ${user.UserName}, waiting for redirect to login page`);
        await page.waitForURL('https://vgusdev01.valgenesis.net/PIHEALTH-DEV/Login/Login.aspx');

        return { success: true, message: 'Signup completed successfully' };
    } catch (err) {
        automationEvents.emit('error', `Signup failed for user ${user.UserName}: ${String(err)}`);
        return { success: false, message: String(err) };
    }
}

/**
 * Fill signup form - Step 1 (Username and Password)
 */
async function fillSignupStep1(page: Page, user: UserFormData): Promise<void> {
    automationEvents.emit('log', `Filling signup form - Step 1 for user: ${user.UserName}`);

    const textBox = page.locator('#txtUserName');
    await expect(textBox).toBeVisible();
    automationEvents.emit('log', `Entering username: ${user.UserName}`);
    await textBox.fill(user.UserName);

    const password = page.locator('#txtPassword');
    automationEvents.emit('log', `Entering password for user: ${user.UserName}`);
    await password.fill(user.Password);

    automationEvents.emit('log', `Submitting step 1 of signup for user: ${user.UserName}`);
    await page.locator('#btnSubmit').click({ force: true, delay: 100 });
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('load');
    await page.waitForLoadState('domcontentloaded');
}

/**
 * Fill signup form - Step 2 (Personal Details)
 */
async function fillSignupStep2(page: Page, user: UserFormData): Promise<void> {
    automationEvents.emit('log', `Filling signup form - Step 2 (Personal Details) for user: ${user.UserName}`);

    const phNumber = page.locator('#txtPhoneNum');
    await expect(phNumber).toBeVisible();
    automationEvents.emit('log', `Entering phone number for user: ${user.UserName}`);
    await phNumber.fill('98987676665');

    automationEvents.emit('log', `Entering address for user: ${user.UserName}`);
    await page.locator('#txtAddress1').fill('1st lane, Hitech city, Hyderabad');

    automationEvents.emit('log', `Setting passwords in step 2 for user: ${user.UserName}`);
    await page.locator('[name="txtPassword"]').fill(user.Password);
    await page.locator('[name="txtREPassword"]').fill(user.Password);

    automationEvents.emit('log', `Saving signup form for user: ${user.UserName}`);
    await page.locator('#btnSave').click();

    automationEvents.emit('log', `Waiting for signup success message for user: ${user.UserName}`);
    await expect(page.locator('#val1_lblCM')).toBeVisible();
    await page.locator('#val1_btnMessageOk').click();
}

/**
 * Logout and navigate to signup page
 */
export async function logoutAndNavigateToSignup(page: Page, username: string): Promise<void> {
    automationEvents.emit('log', `Logging out to start signup process for user: ${username}`);
    await page.getByRole('link', { name: 'Logout' }).click();
    await page.waitForLoadState('networkidle');
}
