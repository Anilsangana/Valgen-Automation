"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDepartment = createDepartment;
const browser_1 = require("../core/browser");
async function createDepartment(page, departments) {
    const results = [];
    for (const d of departments) {
        try {
            browser_1.automationEvents.emit('log', `Processing department: ${d.name}`);
            // TODO: implement search and create
            results.push({ department: d.name, status: 'created' });
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `createDepartment error for ${d.name}: ${String(err)}`);
            results.push({ department: d.name, status: 'error', message: String(err) });
        }
    }
    return results;
}
