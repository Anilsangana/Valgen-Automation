import { Page, FrameLocator } from 'playwright';
import { automationEvents } from '../core/browser';
import { waitForPostback, waitForOverlayGone, waitForIframeLoaderGone } from '../core/navigation';
import { SystemPage } from '../pages/systemPage';

export type CreateCategoryOptions = {
    duplicateStrategy?: 'skip' | 'append' | 'stop';
};

export type CategoryInput = {
    name: string;
    prefix?: string;
    description?: string;
};

/**
 * Creates one or more categories in System → Create → Category.
 *
 * Form selectors discovered from live browser inspection:
 *   Category Name : #txtCatName
 *   Prefix        : #txtPrefix
 *   Description   : #txtDescription
 *   Submit        : #btnSubmit
 *   Success popup : #btnMessageOk  (the "OK" dismiss button)
 *   Duplicate err : #val1_lblErrorAlert  (contains "must be unique" text)
 *   Error dismiss : #val1_btnerrorok
 *
 * The form lives inside an iframe with id="framecontent".
 */
export async function createCategory(
    page: Page,
    categories: CategoryInput[],
    options: CreateCategoryOptions = {}
): Promise<any[]> {
    const results: any[] = [];
    const system = new SystemPage(page);
    const strategy = options.duplicateStrategy ?? 'skip';

    for (const cat of categories) {
        try {
            automationEvents.emit('log', `Creating category: ${cat.name}`);

            // ===================== NAVIGATION =====================
            await system.navigateToCategoryCreate();
            await waitForPostback(page, 15000);
            await waitForOverlayGone(page);

            const frame: FrameLocator = page.frameLocator('#framecontent');

            // Wait for iframe loader to disappear and form to be ready
            await waitForIframeLoaderGone(page, 15000);

            await frame.locator('#txtCatName')
                .waitFor({ state: 'visible', timeout: 8000 });

            await frame.locator('#txtCatName').fill(cat.name);
            await page.waitForTimeout(500);

            // Prefix (optional – default to first 3 uppercase letters of name)
            const prefix = cat.prefix ?? cat.name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
            await frame.locator('#txtPrefix').fill(prefix);
            await page.waitForTimeout(500);

            // Description (optional)
            const description = cat.description ?? `Auto-created category - ${cat.name}`;
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
                        category: cat.name,
                        status: 'failed',
                        reason: 'category name is duplicate'
                    });
                    break;
                }

                if (strategy === 'append') {
                    const newName = `${cat.name}_${Date.now().toString().slice(-4)}`;

                    await frame.locator('#txtCatName').fill(newName);
                    await frame.locator('#btnSubmit').click();
                    await page.waitForTimeout(2000);

                    await successPopup.waitFor({ state: 'visible', timeout: 8000 });

                    await frame.locator('#btnMessageOk').click().catch(() => { });

                    results.push({
                        category: cat.name,
                        createdAs: newName,
                        status: 'created-appended',
                        timestamp: new Date().toISOString()
                    });
                } else {
                    // strategy === 'skip'
                    results.push({
                        category: cat.name,
                        status: 'skipped',
                        reason: 'category name is duplicate'
                    });
                }

                continue;
            }

            // ===================== SUCCESS =====================
            automationEvents.emit('log', `Category created (popup=${popupAppeared}) for: ${cat.name}`);

            // Dismiss success popup
            await frame.locator('#btnMessageOk').click().catch(() => { });

            results.push({
                category: cat.name,
                prefix,
                description,
                status: 'created',
                popup: popupAppeared,
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            automationEvents.emit('error', `Category creation failed for ${cat.name}: ${String(err)}`);
            results.push({
                category: cat.name,
                status: 'error',
                message: String(err)
            });
        }
    }

    return results;
}
