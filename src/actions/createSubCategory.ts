import { Page, FrameLocator } from 'playwright';
import { automationEvents } from '../core/browser';
import { waitForPostback, waitForOverlayGone, waitForIframeLoaderGone } from '../core/navigation';
import { SystemPage } from '../pages/systemPage';

export type CreateSubCategoryOptions = {
    duplicateStrategy?: 'skip' | 'append' | 'stop';
};

export type SubCategoryInput = {
    categoryName: string;
    subCategoryName: string;
    prefix?: string;
    description?: string;
};

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
export async function createSubCategory(
    page: Page,
    subCategories: SubCategoryInput[],
    options: CreateSubCategoryOptions = {}
): Promise<any[]> {
    const results: any[] = [];
    const system = new SystemPage(page);
    const strategy = options.duplicateStrategy ?? 'skip';

    for (const subCat of subCategories) {
        try {
            automationEvents.emit('log', `Creating sub category: ${subCat.subCategoryName} under ${subCat.categoryName}`);

            // ===================== NAVIGATION =====================
            await system.navigateToSubCategoryCreate();
            await waitForPostback(page, 15000);
            await waitForOverlayGone(page);

            const frame: FrameLocator = page.frameLocator('#framecontent');

            // Wait for iframe loader to disappear and form to be ready
            await waitForIframeLoaderGone(page, 15000);

            await frame.locator('#ddlCatName')
                .waitFor({ state: 'visible', timeout: 8000 });

            // ===================== FORM FILLING =====================
            // Select Category
            try {
                await frame.locator('#ddlCatName').selectOption({ label: subCat.categoryName });
                await waitForIframeLoaderGone(page, 5000);
                await waitForOverlayGone(page, 5000);
            } catch (err) {
                automationEvents.emit('error', `Category '${subCat.categoryName}' not found in dropdown. Skipping.`);
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
            await waitForOverlayGone(page, 15000);

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
                    await waitForOverlayGone(page, 15000);

                    await successPopup.waitFor({ state: 'visible', timeout: 8000 });
                    await frame.locator('#btnMessageOk').click().catch(() => { });

                    results.push({
                        subCategory: subCat.subCategoryName,
                        category: subCat.categoryName,
                        createdAs: newName,
                        status: 'created-appended',
                        timestamp: new Date().toISOString()
                    });
                } else {
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
            automationEvents.emit('log', `Sub Category created (popup=${popupAppeared}) for: ${subCat.subCategoryName}`);

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

        } catch (err) {
            automationEvents.emit('error', `Sub Category creation failed for ${subCat.subCategoryName}: ${String(err)}`);
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
