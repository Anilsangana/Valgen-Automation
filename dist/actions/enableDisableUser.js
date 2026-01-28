"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableDisableUser = enableDisableUser;
const browser_1 = require("../core/browser");
async function enableDisableUser(page, users) {
    const results = [];
    for (const u of users) {
        try {
            browser_1.automationEvents.emit('log', `${u.enable ? 'Enabling' : 'Disabling'} user: ${u.username}`);
            // TODO: search user, open profile, change enabled flag, save
            results.push({ user: u.username, status: u.enable ? 'enabled' : 'disabled' });
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `enableDisableUser error for ${u.username}: ${String(err)}`);
            results.push({ user: u.username, status: 'error', message: String(err) });
        }
    }
    return results;
}
