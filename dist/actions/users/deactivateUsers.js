"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateUsers = deactivateUsers;
const browser_1 = require("../../core/browser");
const administrationPage_1 = require("../../pages/administrationPage");
const userDeactivation_1 = require("./userDeactivation");
/**
 * Deactivate multiple users
 * @param page - Playwright page instance
 * @param baseUrl - Base URL of the application
 * @param adminUsername - Admin username for login
 * @param adminPassword - Admin password for login
 * @param usernames - Array of usernames to deactivate
 * @param options - Deactivation options
 */
async function deactivateUsers(page, baseUrl, adminUsername, adminPassword, usernames, options = {}) {
    const results = [];
    const admin = new administrationPage_1.AdministrationPage(page);
    const continueOnError = options.continueOnError ?? true;
    browser_1.automationEvents.emit('log', `Starting deactivation for ${usernames.length} user(s)`);
    for (const username of usernames) {
        try {
            browser_1.automationEvents.emit('log', `Deactivating user: ${username}`);
            const deactivationResult = await (0, userDeactivation_1.deactivateUser)(page, admin, username);
            if (deactivationResult.success) {
                browser_1.automationEvents.emit('log', `✓ Successfully deactivated user: ${username}`);
                results.push({
                    username,
                    status: 'deactivated',
                    message: deactivationResult.message,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                browser_1.automationEvents.emit('error', `Failed to deactivate user ${username}: ${deactivationResult.message}`);
                results.push({
                    username,
                    status: 'failed',
                    message: deactivationResult.message
                });
                if (!continueOnError) {
                    browser_1.automationEvents.emit('log', 'Stopping deactivation process due to error (continueOnError=false)');
                    break;
                }
            }
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `Error deactivating user ${username}: ${String(err)}`);
            results.push({
                username,
                status: 'error',
                message: String(err)
            });
            if (!continueOnError) {
                browser_1.automationEvents.emit('log', 'Stopping deactivation process due to error (continueOnError=false)');
                break;
            }
        }
    }
    browser_1.automationEvents.emit('log', `User deactivation process complete. Total: ${usernames.length}, Successful: ${results.filter(r => r.status === 'deactivated').length}, Failed: ${results.filter(r => r.status !== 'deactivated').length}`);
    return results;
}
