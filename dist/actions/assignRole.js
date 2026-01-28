"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignRole = assignRole;
const browser_1 = require("../core/browser");
async function assignRole(page, assignments) {
    const results = [];
    for (const a of assignments) {
        try {
            browser_1.automationEvents.emit('log', `Assigning role ${a.role} to user ${a.username}`);
            // TODO: search user, open assignments, add role if not present
            results.push({ username: a.username, role: a.role, status: 'assigned' });
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `assignRole error for ${a.username}: ${String(err)}`);
            results.push({ username: a.username, role: a.role, status: 'error', message: String(err) });
        }
    }
    return results;
}
