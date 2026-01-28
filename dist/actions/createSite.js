"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSite = createSite;
const browser_1 = require("../core/browser");
async function createSite(page, sites) {
    const results = [];
    for (const s of sites) {
        try {
            browser_1.automationEvents.emit('log', `Processing site: ${s.name}`);
            // TODO: implement search and create
            results.push({ site: s.name, status: 'created' });
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `createSite error for ${s.name}: ${String(err)}`);
            results.push({ site: s.name, status: 'error', message: String(err) });
        }
    }
    return results;
}
