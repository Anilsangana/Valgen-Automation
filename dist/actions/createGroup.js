"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroup = createGroup;
const browser_1 = require("../core/browser");
const navigation_1 = require("../core/navigation");
const systemPage_1 = require("../pages/systemPage");
/**
 * Creates one or more groups in System → Create → Group.
 *
 * KEY BEHAVIOURS discovered by live browser inspection:
 *
 *   1. The form DEFAULTS to "Internal" group type and loads users IMMEDIATELY.
 *      ❌ DON'T select Internal again if it's already selected — it causes a
 *         wasteful reload that empties the user list temporarily.
 *      ✅ Only trigger a selectOption change if the desired type differs from
 *         what is already selected. Then wait for BOTH overlays.
 *
 *   2. "Select All" in Available Users is a DevExpress CUSTOM element (type="text").
 *      ❌ DON'T use isChecked() or check by ID — it's not a real HTML checkbox.
 *      ✅ Click it using frame.locator('text=Select All').first() — the label text.
 *         When clicked, the hidden input value changes to "C" (Checked).
 *         Users then appear in Selected Users with class "dxeListBoxItemSelected".
 *
 *   3. Notification popup "Select Users from the Available list" appears when submit
 *      is clicked with zero users selected. Dismiss with #btnNotificationOk.
 *
 *   4. Overlay selectors confirmed live:
 *      Page:  .Ajaxloading, .Ajaxloading-bg, #imgPgrss, #spMPB_backgroundElement
 *      Frame: #lboxAvilableUser_LD, #lboxAssignedUser_LD, .dxlp-loadingImage
 *
 * Form selectors:
 *   Group Name     : #txtboxGroupName
 *   Group Type     : #ddlGroupType  (1=Internal, 2=External, 3=Review and Approval)
 *   Description    : #txtboxGroupDescription
 *   Select All (Available Users label): text=Select All  (first match)
 *   Submit         : #btnSubmit
 *   Notification popup (no users): #btnNotificationOk
 *   Success popup  : #btnMessageOk
 *   Error dismiss  : #val1_btnerrorok
 */
async function createGroup(page, groups, options = {}) {
    const results = [];
    const system = new systemPage_1.SystemPage(page);
    const strategy = options.duplicateStrategy ?? 'skip';
    const groupTypeMap = {
        'Internal': '1',
        'External': '2',
        'Review and Approval': '3'
    };
    for (const grp of groups) {
        try {
            browser_1.automationEvents.emit('log', `Creating group: ${grp.name}`);
            // ===================== STAGE 1: NAVIGATION =====================
            browser_1.automationEvents.emit('log', '→ Navigating to System → Create → Group...');
            await system.navigateToGroupCreate();
            // Wait for page-level overlay to clear after navigation postback
            await (0, navigation_1.waitForPostback)(page, 15000);
            await (0, navigation_1.waitForOverlayGone)(page);
            const frame = page.frameLocator('#framecontent');
            // Wait for form to be ready — users load immediately with Internal default
            await frame.locator('#txtboxGroupName')
                .waitFor({ state: 'visible', timeout: 15000 });
            // Wait for the DevExpress user list to finish its initial load too
            await (0, navigation_1.waitForIframeLoaderGone)(page, 15000);
            browser_1.automationEvents.emit('log', '✓ Group form loaded with users ready');
            // ===================== FILL GROUP NAME =====================
            await frame.locator('#txtboxGroupName').fill(grp.name);
            await page.waitForTimeout(300);
            // ===================== STAGE 2: SELECT GROUP TYPE =====================
            // IMPORTANT: The form defaults to Internal (value "1").
            // Only trigger selectOption if the desired type is DIFFERENT from current.
            // Changing group type triggers a postback that reloads the user list.
            const desiredType = grp.groupType ?? 'Internal';
            const desiredValue = groupTypeMap[desiredType] ?? '1';
            const currentValue = await frame.locator('#ddlGroupType').inputValue().catch(() => '1');
            if (currentValue !== desiredValue) {
                browser_1.automationEvents.emit('log', `→ Changing Group Type to: ${desiredType}`);
                await frame.locator('#ddlGroupType').selectOption(desiredValue);
                // Wait for page-level overlay AND iframe DevExpress list loaders
                await (0, navigation_1.waitForOverlayGone)(page, 20000);
                await (0, navigation_1.waitForIframeLoaderGone)(page, 20000);
                browser_1.automationEvents.emit('log', `✓ Group type changed — user list reloaded`);
            }
            else {
                browser_1.automationEvents.emit('log', `✓ Group type already set to: ${desiredType}`);
            }
            // ===================== FILL DESCRIPTION =====================
            const description = grp.description ?? `Auto-created group - ${grp.name}`;
            await frame.locator('#txtboxGroupDescription').fill(description);
            await page.waitForTimeout(300);
            // ===================== SELECT ALL USERS =====================
            // DevExpress custom checkbox — click via visible text "Select All" label.
            // When selected: hidden input #lboxAvilableUser_LBSACB_S gets value "C".
            // Users appear in Selected Users panel with class "dxeListBoxItemSelected".
            if (grp.selectAllUsers !== false) {
                try {
                    browser_1.automationEvents.emit('log', '→ Selecting all available users...');
                    // Click the "Select All" text/label in the Available Users panel (first one)
                    await frame.locator('text=Select All').first().click();
                    await page.waitForTimeout(800);
                    // Verify selection took effect by checking the hidden value
                    const selectAllVal = await frame.locator('#lboxAvilableUser_LBSACB_S').inputValue().catch(() => '');
                    if (selectAllVal === 'C') {
                        browser_1.automationEvents.emit('log', '✓ All available users selected');
                    }
                    else {
                        browser_1.automationEvents.emit('log', `⚠️ Select All value: "${selectAllVal}" — may be empty list or already selected`);
                    }
                }
                catch (e) {
                    browser_1.automationEvents.emit('log', `⚠️ Could not select all users: ${String(e)}`);
                }
            }
            // ===================== STAGE 3: SUBMIT =====================
            // Ensure page is stable before submitting
            await (0, navigation_1.waitForOverlayGone)(page, 10000);
            browser_1.automationEvents.emit('log', '→ Clicking Submit...');
            await frame.locator('#btnSubmit').click();
            // Wait for the submit postback overlay to clear
            await (0, navigation_1.waitForOverlayGone)(page, 20000);
            // ===================== POPUP DETECTION =====================
            // Three possible outcomes:
            //   a) Success popup (#btnMessageOk) — group created
            //   b) Duplicate error (#val1_lblErrorAlert) — name already exists
            //   c) Notification (#btnNotificationOk) — "Select Users from the Available list"
            const successPopup = frame.locator('#btnMessageOk');
            const duplicatePopup = frame.locator('#val1_lblErrorAlert');
            const notificationPopup = frame.locator('#btnNotificationOk');
            const popupAppeared = await Promise.race([
                successPopup.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'success'),
                duplicatePopup.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'duplicate'),
                notificationPopup.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'notification')
            ]).catch(() => 'none');
            // ===================== HANDLE NOTIFICATION (no users selected) =====================
            if (popupAppeared === 'notification') {
                browser_1.automationEvents.emit('log', '⚠️ Notification: "Select Users from Available list" — user list was empty');
                await frame.locator('#btnNotificationOk').click().catch(() => { });
                // Proceed to save result as "created without users" if user requested no users
                // OR as error if they wanted users
                results.push({
                    group: grp.name,
                    groupType: desiredType,
                    description,
                    status: grp.selectAllUsers === false ? 'created' : 'error',
                    message: grp.selectAllUsers === false
                        ? 'Group created without users (empty group)'
                        : 'Available users list was empty — no users were selected',
                    timestamp: new Date().toISOString()
                });
                continue;
            }
            // ===================== DUPLICATE HANDLING =====================
            if (popupAppeared === 'duplicate') {
                await frame.locator('#val1_btnerrorok').click().catch(() => { });
                await (0, navigation_1.waitForOverlayGone)(page, 10000);
                if (strategy === 'stop') {
                    results.push({ group: grp.name, status: 'failed', reason: 'group name is duplicate' });
                    break;
                }
                if (strategy === 'append') {
                    const newName = `${grp.name}_${Date.now().toString().slice(-4)}`;
                    await frame.locator('#txtboxGroupName').fill(newName);
                    await frame.locator('#btnSubmit').click();
                    await (0, navigation_1.waitForOverlayGone)(page, 20000);
                    await successPopup.waitFor({ state: 'visible', timeout: 10000 });
                    await frame.locator('#btnMessageOk').click().catch(() => { });
                    results.push({
                        group: grp.name, createdAs: newName,
                        status: 'created-appended', timestamp: new Date().toISOString()
                    });
                }
                else {
                    results.push({ group: grp.name, status: 'skipped', reason: 'group name is duplicate' });
                }
                continue;
            }
            // ===================== SUCCESS =====================
            browser_1.automationEvents.emit('log', `✓ Group created (popup=${popupAppeared}): ${grp.name}`);
            await frame.locator('#btnMessageOk').click().catch(() => { });
            results.push({
                group: grp.name,
                groupType: desiredType,
                description,
                status: 'created',
                popup: popupAppeared,
                timestamp: new Date().toISOString()
            });
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `Group creation failed for ${grp.name}: ${String(err)}`);
            results.push({ group: grp.name, status: 'error', message: String(err) });
        }
    }
    return results;
}
