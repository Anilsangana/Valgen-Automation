"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUsers = createUsers;
const browser_1 = require("../../core/browser");
const administrationPage_1 = require("../../pages/administrationPage");
const login_1 = require("../../core/login");
const userFormFill_1 = require("./userFormFill");
const userSignup_1 = require("./userSignup");
const userActivation_1 = require("./userActivation");
const userVerification_1 = require("./userVerification");
const duplicateHandling_1 = require("./duplicateHandling");
const popupHandlers_1 = require("./popupHandlers");
/**
 * Main function to create users with complete workflow:
 * 1. Fill admin form
 * 2. Handle duplicates
 * 3. Complete signup
 * 4. Admin activation
 * 5. Verify login
 */
async function createUsers(page, baseUrl, adminUsername, adminPassword, users, options = {}) {
    const results = [];
    const admin = new administrationPage_1.AdministrationPage(page);
    const strategy = options.duplicateStrategy ?? 'skip';
    for (const u of users) {
        try {
            browser_1.automationEvents.emit('log', `Processing user: ${u.Email}`);
            // ===================== NAVIGATION =====================
            await admin.navigateToUserCreate();
            const frame = await (0, userFormFill_1.navigateToUserCreateForm)(page);
            // ===================== FORM FILLING =====================
            await (0, userFormFill_1.fillUserCreationForm)(page, frame, u);
            // ===================== SUBMIT =====================
            await (0, popupHandlers_1.submitUserCreationForm)(page, frame, u.Email);
            // ===================== POPUP DETECTION =====================
            const popupResult = await (0, duplicateHandling_1.checkForDuplicateOrSuccess)(page, frame, u.Email);
            // ===================== HANDLE DUPLICATE =====================
            if (popupResult.isDuplicate) {
                const duplicateResult = await handleDuplicateUser(page, frame, baseUrl, adminUsername, adminPassword, admin, u, strategy, popupResult.message || '');
                results.push(duplicateResult);
                if (strategy === 'stop' || duplicateResult.status === 'skipped') {
                    if (strategy === 'stop')
                        break;
                    continue;
                }
                continue;
            }
            // ===================== HANDLE SUCCESS =====================
            if (popupResult.isSuccess) {
                await (0, popupHandlers_1.handleSuccessPopup)(page, frame, u.Email);
                const successResult = await handleSuccessfulUserCreation(page, baseUrl, adminUsername, adminPassword, admin, u);
                results.push(successResult);
                continue;
            }
            // ===================== NO POPUP DETECTED =====================
            browser_1.automationEvents.emit('error', `No popup detected for user: ${u.Email}`);
            results.push({
                email: u.Email,
                status: 'error',
                message: popupResult.message || 'No success or duplicate popup detected'
            });
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `createUsers error for ${u.Email}: ${String(err)}`);
            results.push({
                email: u.Email,
                status: 'error',
                message: String(err)
            });
        }
    }
    return results;
}
/**
 * Handle duplicate user scenario based on strategy
 */
async function handleDuplicateUser(page, frame, baseUrl, adminUsername, adminPassword, admin, user, strategy, errorMessage) {
    browser_1.automationEvents.emit('error', `Duplicate user detected: ${errorMessage}`);
    await (0, duplicateHandling_1.handleDuplicatePopup)(frame);
    if (strategy === 'stop') {
        return {
            email: user.Email,
            status: 'failed',
            reason: errorMessage
        };
    }
    if (strategy === 'append') {
        const { newUser, newEmail } = await (0, duplicateHandling_1.retryWithModifiedCredentials)(page, frame, user);
        // Complete the full workflow for the modified user
        await (0, userSignup_1.logoutAndNavigateToSignup)(page, newUser);
        const modifiedUser = { ...user, UserName: newUser, Email: newEmail };
        const signupResult = await (0, userSignup_1.completeUserSignup)(page, modifiedUser);
        if (!signupResult.success) {
            return {
                email: user.Email,
                username: newUser,
                status: 'signup-failed',
                error: signupResult.message
            };
        }
        // Admin login and activate
        const adminLoginResult = await (0, login_1.login)(page, baseUrl, adminUsername, adminPassword);
        if (!adminLoginResult.success) {
            return {
                email: user.Email,
                username: newUser,
                status: 'signup-complete-but-admin-login-failed',
                error: adminLoginResult.message
            };
        }
        const activationResult = await (0, userActivation_1.activateUser)(page, admin, newUser);
        if (!activationResult.success) {
            return {
                email: user.Email,
                username: newUser,
                status: 'activation-failed',
                error: activationResult.message
            };
        }
        return {
            email: newEmail,
            original: user.Email,
            createdAs: newEmail,
            username: newUser,
            status: 'created-appended'
        };
    }
    // Default: skip
    return {
        email: user.Email,
        status: 'skipped',
        reason: errorMessage
    };
}
/**
 * Handle successful user creation - complete signup, activation, and verification
 */
async function handleSuccessfulUserCreation(page, baseUrl, adminUsername, adminPassword, admin, user) {
    // ===================== LOGOUT AND START SIGNUP =====================
    await (0, userSignup_1.logoutAndNavigateToSignup)(page, user.UserName);
    // ===================== COMPLETE SIGNUP PROCESS =====================
    const signupResult = await (0, userSignup_1.completeUserSignup)(page, user);
    if (!signupResult.success) {
        return {
            email: user.Email,
            username: user.UserName,
            status: 'signup-failed',
            error: signupResult.message
        };
    }
    // ===================== ADMIN LOGIN TO APPROVE USER =====================
    browser_1.automationEvents.emit('log', `Starting admin login to approve user: ${user.UserName}`);
    const adminLoginResult = await (0, login_1.login)(page, baseUrl, adminUsername, adminPassword);
    if (!adminLoginResult.success) {
        browser_1.automationEvents.emit('error', `Admin login failed for approving user ${user.UserName}: ${adminLoginResult.message}`);
        return {
            email: user.Email,
            username: user.UserName,
            status: 'signup-complete-but-admin-login-failed',
            error: adminLoginResult.message
        };
    }
    browser_1.automationEvents.emit('log', `✓ Admin logged in successfully, proceeding to approve user: ${user.UserName}`);
    await page.waitForLoadState('networkidle');
    // ===================== USER ACTIVATION PROCESS =====================
    const activationResult = await (0, userActivation_1.activateUser)(page, admin, user.UserName);
    if (!activationResult.success) {
        return {
            email: user.Email,
            username: user.UserName,
            status: 'activation-failed',
            error: activationResult.message
        };
    }
    // ===================== VERIFY NEW USER LOGIN =====================
    const verificationResult = await (0, userVerification_1.verifyUserLogin)(page, baseUrl, user.UserName, user.Password);
    if (verificationResult.loginVerified) {
        // User successfully logged in, now logout
        await (0, userVerification_1.logoutAfterVerification)(page);
        return {
            email: user.Email,
            username: user.UserName,
            status: 'created-activated-and-verified',
            loginVerified: true,
            timestamp: new Date().toISOString()
        };
    }
    else {
        // Login failed - user is already on login page, no need to logout
        browser_1.automationEvents.emit('log', `User ${user.UserName} login verification failed, user is already logged out`);
        return {
            email: user.Email,
            username: user.UserName,
            status: 'activated-but-login-failed',
            loginVerified: false,
            loginError: verificationResult.message
        };
    }
}
