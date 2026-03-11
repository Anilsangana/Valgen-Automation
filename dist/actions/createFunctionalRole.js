"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFunctionalRole = createFunctionalRole;
const browser_1 = require("../core/browser");
const navigation_1 = require("../core/navigation");
const systemPage_1 = require("../pages/systemPage");
/**
 * Creates one or more Functional Roles in System -> Create -> Functional Role.
 *
 * Form selectors discovered from live browser inspection:
 *   Functional Role Name : #txtFnRoleName
 *   Prefix               : #txtFnRolePrefix
 *   Description          : #txtFnRoleDesc
 *   Submit               : button name "Submit"
 *   Success popup ok     : button name "Ok"
 *
 * The form lives inside an iframe with name="framecontent".
 */
async function createFunctionalRole(page, roles, options = {}) {
    const results = [];
    const system = new systemPage_1.SystemPage(page);
    const strategy = options.duplicateStrategy ?? 'skip';
    for (const role of roles) {
        try {
            browser_1.automationEvents.emit('log', `Creating Functional Role: ${role.name}`);
            // ===================== NAVIGATION =====================
            await system.navigateToFunctionalRoleCreate();
            await (0, navigation_1.waitForPostback)(page, 15000);
            await (0, navigation_1.waitForOverlayGone)(page);
            const frame = page.frameLocator('iframe[name="framecontent"]');
            // Wait for iframe loader to disappear and form to be ready
            await (0, navigation_1.waitForIframeLoaderGone)(page, 15000);
            await frame.locator('#txtFnRoleName')
                .waitFor({ state: 'visible', timeout: 8000 });
            await frame.locator('#txtFnRoleName').fill(role.name);
            await page.waitForTimeout(500);
            // Prefix (optional - default to first 3 uppercase letters of name)
            const prefix = role.prefix ?? role.name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
            await frame.locator('#txtFnRolePrefix').fill(prefix);
            await page.waitForTimeout(500);
            // Description (optional)
            const description = role.description ?? `Auto-created role - ${role.name}`;
            await frame.locator('#txtFnRoleDesc').fill(description);
            await page.waitForTimeout(500);
            // ===================== SUBMIT =====================
            await frame.getByRole('button', { name: 'Submit' }).click();
            await (0, navigation_1.waitForOverlayGone)(page, 15000);
            // ===================== POPUP DETECTION =====================
            const successPopup = frame.getByRole('button', { name: 'Ok' });
            // Assuming val1_lblErrorAlert is standard for duplicate form validation message across modules
            const duplicatePopup = frame.locator('#val1_lblErrorAlert');
            const popupAppeared = await Promise.race([
                successPopup.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'success'),
                duplicatePopup.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'duplicate')
            ]).catch(() => 'none');
            // ===================== DUPLICATE HANDLING =====================
            if (popupAppeared === 'duplicate') {
                await frame.locator('#val1_btnerrorok').click().catch(() => { });
                if (strategy === 'stop') {
                    results.push({
                        functionalRole: role.name,
                        status: 'failed',
                        reason: 'functional role name is duplicate'
                    });
                    break;
                }
                if (strategy === 'append') {
                    const newName = `${role.name}_${Date.now().toString().slice(-4)}`;
                    await frame.locator('#txtFnRoleName').fill(newName);
                    await frame.getByRole('button', { name: 'Submit' }).click();
                    await page.waitForTimeout(2000);
                    await successPopup.waitFor({ state: 'visible', timeout: 8000 });
                    await frame.getByRole('button', { name: 'Ok' }).click().catch(() => { });
                    results.push({
                        functionalRole: role.name,
                        createdAs: newName,
                        status: 'created-appended',
                        timestamp: new Date().toISOString()
                    });
                }
                else {
                    // strategy === 'skip'
                    results.push({
                        functionalRole: role.name,
                        status: 'skipped',
                        reason: 'functional role name is duplicate'
                    });
                }
                continue;
            }
            // ===================== SUCCESS =====================
            browser_1.automationEvents.emit('log', `Functional Role created (popup=${popupAppeared}) for: ${role.name}`);
            // Dismiss success popup
            await frame.getByRole('button', { name: 'Ok' }).click().catch(() => { });
            results.push({
                functionalRole: role.name,
                prefix,
                description,
                status: 'created',
                popup: popupAppeared,
                timestamp: new Date().toISOString()
            });
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `Functional Role creation failed for ${role.name}: ${String(err)}`);
            results.push({
                functionalRole: role.name,
                status: 'error',
                message: String(err)
            });
        }
    }
    return results;
}
