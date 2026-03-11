"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubCategory = createSubCategory;
const browser_1 = require("../core/browser");
const navigation_1 = require("../core/navigation");
const systemPage_1 = require("../pages/systemPage");
/**
 * Creates one or more Sub Categories in System → Create → Sub Category.
 *
 * Form selectors:
 *   Category Dropdown : #ddlCatName
 *   Sub Category Name : #txtCatName
 *   Prefix            : #txtPrefix
 *   Description       : #txtDescription
 *   Submit            : #btnSubmit
 *   Success popup     : #btnMessageOk
 *   Duplicate err     : #val1_lblErrorAlert
 *   Error dismiss     : #val1_btnerrorok
 */
async function createSubCategory(page, subCategories, options = {}) {
    const results = [];
    const system = new systemPage_1.SystemPage(page);
    const strategy = options.duplicateStrategy ?? 'skip';
    for (const subCat of subCategories) {
        try {
            browser_1.automationEvents.emit('log', `Creating sub category: ${subCat.subCategoryName} under ${subCat.categoryName}`);
            // ===================== NAVIGATION =====================
            await system.navigateToSubCategoryCreate();
            await (0, navigation_1.waitForPostback)(page, 15000);
            await (0, navigation_1.waitForOverlayGone)(page);
            const frame = page.frameLocator('#framecontent');
            // Wait for iframe loader to disappear and form to be ready
            await (0, navigation_1.waitForIframeLoaderGone)(page, 15000);
            await frame.locator('#ddlCatName')
                .waitFor({ state: 'visible', timeout: 8000 });
            // ===================== FORM FILLING =====================
            // Select Category
            try {
                await frame.locator('#ddlCatName').selectOption({ label: subCat.categoryName });
                await (0, navigation_1.waitForIframeLoaderGone)(page, 5000);
                await (0, navigation_1.waitForOverlayGone)(page, 5000);
            }
            catch (err) {
                browser_1.automationEvents.emit('error', `Category '${subCat.categoryName}' not found in dropdown. Skipping.`);
                results.push({
                    subCategory: subCat.subCategoryName,
                    category: subCat.categoryName,
                    status: 'error',
                    message: `Category not found: ${subCat.categoryName}`
                });
                continue;
            }
            // Fill Sub Category Name
            await frame.locator('#txtCatName').fill(subCat.subCategoryName);
            await page.waitForTimeout(500);
            // Prefix (optional – default to first 3 uppercase letters of name)
            const prefix = subCat.prefix ?? subCat.subCategoryName.replace(/\s+/g, '').substring(0, 3).toUpperCase();
            await frame.locator('#txtPrefix').fill(prefix);
            await page.waitForTimeout(500);
            // Description (optional)
            const description = subCat.description ?? `Auto-created sub category - ${subCat.subCategoryName}`;
            await frame.locator('#txtDescription').fill(description);
            await page.waitForTimeout(500);
            // ===================== SUBMIT =====================
            await frame.locator('#btnSubmit').click();
            await (0, navigation_1.waitForOverlayGone)(page, 15000);
            // ===================== POPUP DETECTION =====================
            const successPopup = frame.locator('#btnMessageOk');
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
                        subCategory: subCat.subCategoryName,
                        category: subCat.categoryName,
                        status: 'failed',
                        reason: 'sub category name is duplicate'
                    });
                    break;
                }
                if (strategy === 'append') {
                    const newName = `${subCat.subCategoryName}_${Date.now().toString().slice(-4)}`;
                    await frame.locator('#txtCatName').fill(newName);
                    await frame.locator('#btnSubmit').click();
                    await (0, navigation_1.waitForOverlayGone)(page, 15000);
                    await successPopup.waitFor({ state: 'visible', timeout: 8000 });
                    await frame.locator('#btnMessageOk').click().catch(() => { });
                    results.push({
                        subCategory: subCat.subCategoryName,
                        category: subCat.categoryName,
                        createdAs: newName,
                        status: 'created-appended',
                        timestamp: new Date().toISOString()
                    });
                }
                else {
                    // strategy === 'skip'
                    results.push({
                        subCategory: subCat.subCategoryName,
                        category: subCat.categoryName,
                        status: 'skipped',
                        reason: 'sub category name is duplicate'
                    });
                }
                continue;
            }
            // ===================== SUCCESS =====================
            browser_1.automationEvents.emit('log', `Sub Category created (popup=${popupAppeared}) for: ${subCat.subCategoryName}`);
            // Dismiss success popup
            await frame.locator('#btnMessageOk').click().catch(() => { });
            results.push({
                subCategory: subCat.subCategoryName,
                category: subCat.categoryName,
                prefix,
                description,
                status: 'created',
                popup: popupAppeared,
                timestamp: new Date().toISOString()
            });
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `Sub Category creation failed for ${subCat.subCategoryName}: ${String(err)}`);
            results.push({
                subCategory: subCat.subCategoryName,
                category: subCat.categoryName,
                status: 'error',
                message: String(err)
            });
        }
    }
    return results;
}
