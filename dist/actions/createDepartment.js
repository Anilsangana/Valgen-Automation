"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDepartment = createDepartment;
const browser_1 = require("../core/browser");
const navigation_1 = require("../core/navigation");
const administrationPage_1 = require("../pages/administrationPage");
async function createDepartment(page, departments, options = {}) {
    const results = [];
    const admin = new administrationPage_1.AdministrationPage(page);
    const strategy = options.duplicateStrategy ?? 'skip';
    for (const d of departments) {
        try {
            browser_1.automationEvents.emit('log', `Creating department: ${d.name}`);
            // ===================== NAVIGATION =====================
            await admin.navigateToDepartmentCreate();
            await (0, navigation_1.waitForPostback)(page, 15000);
            await (0, navigation_1.waitForOverlayGone)(page);
            const frame = page.frameLocator('#framecontent');
            // ===================== FORM FILLING =====================
            await page.waitForTimeout(1000);
            await frame.locator('#txtboxDepartmentName')
                .waitFor({ state: 'visible', timeout: 8000 });
            await frame.locator('#txtboxDepartmentName')
                .fill(d.name);
            await page.waitForTimeout(2000);
            if (d.description) {
                await frame.locator('#txtBoxDesc')
                    .fill(d.description);
            }
            else {
                await frame.locator('#txtBoxDesc')
                    .fill(`Auto created department - ${d.name}`);
            }
            await page.waitForTimeout(2000);
            // ===================== SUBMIT =====================
            await frame.locator('#btnSubmit').click();
            await page.waitForTimeout(2000);
            // ===================== POPUP DETECTION =====================
            const successPopup = frame.locator('#val1_lblCM');
            const duplicatePopup = frame.locator('#val1_lblErrorAlert', { hasText: 'Department Name must be unique' });
            const popupAppeared = await Promise.race([
                successPopup.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'success'),
                duplicatePopup.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'duplicate')
            ]).catch(() => 'none');
            // ===================== DUPLICATE HANDLING =====================
            if (popupAppeared === 'duplicate') {
                await frame.locator('#val1_btnerrorok').click().catch(() => { });
                if (strategy === 'stop') {
                    results.push({
                        department: d.name,
                        status: 'failed',
                        reason: 'department name is duplicate'
                    });
                    break;
                }
                if (strategy === 'append') {
                    const newName = `${d.name}_${Date.now().toString().slice(-4)}`;
                    await frame.locator('#txtboxDepartmentName').fill(newName);
                    await frame.locator('#btnSubmit').click();
                    await page.waitForTimeout(2000);
                    await successPopup.waitFor({ state: 'visible', timeout: 8000 });
                    results.push({
                        original: d.name,
                        createdAs: newName,
                        status: 'created-appended'
                    });
                }
                else {
                    results.push({
                        department: d.name,
                        status: 'skipped',
                        reason: 'department name is duplicate'
                    });
                }
                continue;
            }
            // ===================== SUCCESS =====================
            browser_1.automationEvents.emit('log', `Department created (popup=${popupAppeared}) for: ${d.name}`);
            results.push({
                department: d.name,
                status: 'created',
                popup: popupAppeared
            });
            await frame.locator('#btnMessageOk').click().catch(() => { });
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `Department creation failed for ${d.name}: ${String(err)}`);
            results.push({
                department: d.name,
                status: 'error',
                message: String(err)
            });
        }
    }
    return results;
}
