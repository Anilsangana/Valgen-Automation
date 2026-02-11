import { Page } from 'playwright';
import { automationEvents } from '../../core/browser';
import { AdministrationPage } from '../../pages/administrationPage';
import { deactivateUser } from './userDeactivation';

export interface DeactivateUsersOptions {
    continueOnError?: boolean; // Whether to continue deactivating other users if one fails
}

export interface DeactivateUserResult {
    username: string;
    status: 'deactivated' | 'failed' | 'error';
    message?: string;
    timestamp?: string;
}

/**
 * Deactivate multiple users
 * @param page - Playwright page instance
 * @param baseUrl - Base URL of the application
 * @param adminUsername - Admin username for login
 * @param adminPassword - Admin password for login
 * @param usernames - Array of usernames to deactivate
 * @param options - Deactivation options
 */
export async function deactivateUsers(
    page: Page,
    baseUrl: string,
    adminUsername: string,
    adminPassword: string,
    usernames: string[],
    options: DeactivateUsersOptions = {}
): Promise<DeactivateUserResult[]> {
    const results: DeactivateUserResult[] = [];
    const admin = new AdministrationPage(page);
    const continueOnError = options.continueOnError ?? true;

    automationEvents.emit('log', `Starting deactivation for ${usernames.length} user(s)`);

    for (const username of usernames) {
        try {
            automationEvents.emit('log', `Deactivating user: ${username}`);

            const deactivationResult = await deactivateUser(page, admin, username);

            if (deactivationResult.success) {
                automationEvents.emit('log', `✓ Successfully deactivated user: ${username}`);
                results.push({
                    username,
                    status: 'deactivated',
                    message: deactivationResult.message,
                    timestamp: new Date().toISOString()
                });
            } else {
                automationEvents.emit('error', `Failed to deactivate user ${username}: ${deactivationResult.message}`);
                results.push({
                    username,
                    status: 'failed',
                    message: deactivationResult.message
                });

                if (!continueOnError) {
                    automationEvents.emit('log', 'Stopping deactivation process due to error (continueOnError=false)');
                    break;
                }
            }
        } catch (err) {
            automationEvents.emit('error', `Error deactivating user ${username}: ${String(err)}`);
            results.push({
                username,
                status: 'error',
                message: String(err)
            });

            if (!continueOnError) {
                automationEvents.emit('log', 'Stopping deactivation process due to error (continueOnError=false)');
                break;
            }
        }
    }

    automationEvents.emit('log', `User deactivation process complete. Total: ${usernames.length}, Successful: ${results.filter(r => r.status === 'deactivated').length}, Failed: ${results.filter(r => r.status !== 'deactivated').length}`);

    return results;
}
