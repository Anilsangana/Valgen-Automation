"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnit = createUnit;
const browser_1 = require("../core/browser");
async function createUnit(page, units) {
    const results = [];
    for (const u of units) {
        try {
            browser_1.automationEvents.emit('log', `Processing unit: ${u.name}`);
            // TODO: implement search and create
            results.push({ unit: u.name, status: 'created' });
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `createUnit error for ${u.name}: ${String(err)}`);
            results.push({ unit: u.name, status: 'error', message: String(err) });
        }
    }
    return results;
}
