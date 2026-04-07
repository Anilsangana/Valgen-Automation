import { Page, FrameLocator } from 'playwright';
import { automationEvents } from '../core/browser';
import { waitForPostback, waitForOverlayGone, waitForIframeLoaderGone } from '../core/navigation';
import { SystemPage } from '../pages/systemPage';

/**
 * Workflow creation input. Matches the real "Create Workflow" form fields
 * discovered via live browser inspection on 2026-03-31.
 *
 * FORM SELECTORS (inside iframe[name="framecontent"]):
 *   Workflow Name     : #txtWName
 *   Workflow ID       : auto-generated (read-only)
 *   Applicable To     : checkboxes #chkApplicableTo_0 … _6
 *                        0=Authoring, 1=Exception, 2=Execution,
 *                        3=Project, 4=Scheduler, 5=System Manager, 6=Assessment
 *   Description       : #txtDescription
 *   Review Required?  : radio  #rbtYes (value=1)  /  #rbtNo (value=0)
 *
 *   ── Review Workflow section ──
 *   Available Groups  : #lstReviewer  (select-multiple)
 *   Selected Groups   : #lstAssreviewer
 *   Move >            : #btnRAdd
 *   Move <            : #btnRRem
 *   Grid row 1:
 *     Reviewers       : #grvReview_ctl02_txtGroupUser
 *     Functional Role : #grvReview_ctl02_ddlFunctionalRole
 *     Review Period   : #grvReview_ctl02_txtTenure
 *     Frequency       : #grvReview_ctl02_txtAlert
 *     Serial/Parallel : #grvReview_ctl02_ddlSerial
 *   Add row           : #btnAddRview
 *
 *   ── Approval Workflow section ──
 *   Available Groups  : #lstApAvailbleUser  (select-multiple)
 *   Selected Groups   : #lstApAssignUser
 *   Move >            : #btnAAdd
 *   Move <            : #btnARem
 *   Grid row 1:
 *     Approvers       : #grvApprove_ctl02_txtGroupUser
 *     Functional Role : #grvApprove_ctl02_ddlFunctionalRole
 *     Approval Period : #grvApprove_ctl02_txtTenure
 *     Frequency       : #grvApprove_ctl02_txtAlert
 *     Serial/Parallel : #grvApprove_ctl02_ddlSerial
 *   Add row           : #btnAddApprove
 *
 *   Submit            : #btnSubmit
 *   Reset             : #btnReset
 */

export type ApplicableTo =
    | 'Authoring' | 'Exception' | 'Execution'
    | 'Project' | 'Scheduler' | 'System Manager' | 'Assessment';

export interface WorkflowStepInput {
    /** Name of the group to select as reviewer/approver */
    group?: string;
    /** Functional role label to pick from the dropdown */
    functionalRole?: string;
    /** Period in days */
    periodDays?: number;
    /** Frequency in days */
    frequencyDays?: number;
    /** Serial or Parallel */
    serialParallel?: 'Serial' | 'Parallel';
}

export interface WorkflowInput {
    name: string;
    description?: string;
    applicableTo?: ApplicableTo[];
    reviewRequired?: boolean;
    reviewGroups?: string[];                 // group names to move to "Selected"
    reviewSteps?: WorkflowStepInput[];
    approvalGroups?: string[];               // group names to move to "Selected"
    approvalSteps?: WorkflowStepInput[];
}

const APPLICABLE_TO_INDEX: Record<ApplicableTo, number> = {
    'Authoring': 0,
    'Exception': 1,
    'Execution': 2,
    'Project': 3,
    'Scheduler': 4,
    'System Manager': 5,
    'Assessment': 6,
};

/**
 * Creates one or more Workflows in System → Create → Workflow.
 * Each workflow goes through its own navigation→fill→submit cycle.
 */
export async function createWorkflow(
    page: Page,
    workflows: WorkflowInput[]
): Promise<any[]> {
    const results: any[] = [];
    const system = new SystemPage(page);

    for (const wf of workflows) {
        try {
            automationEvents.emit('log', `Creating Workflow: ${wf.name}`);

            // ===================== NAVIGATION =====================
            await system.navigateToWorkflowCreate();
            await waitForPostback(page, 15000);
            await waitForOverlayGone(page);

            const frame: FrameLocator = page.frameLocator('iframe[name="framecontent"]');
            await waitForIframeLoaderGone(page, 15000);

            // Wait for form
            await frame.locator('#txtWName').waitFor({ state: 'visible', timeout: 10000 });

            // ===================== FILL BASIC FIELDS =====================

            // Workflow Name (mandatory)
            await frame.locator('#txtWName').fill(wf.name);
            automationEvents.emit('log', `  📝 Workflow Name: ${wf.name}`);
            await page.waitForTimeout(300);

            // Applicable To checkboxes
            if (wf.applicableTo && wf.applicableTo.length > 0) {
                for (const item of wf.applicableTo) {
                    const idx = APPLICABLE_TO_INDEX[item];
                    if (idx !== undefined) {
                        const cb = frame.locator(`#chkApplicableTo_${idx}`);
                        if (!(await cb.isChecked())) {
                            await cb.check({ force: true });
                        }
                        automationEvents.emit('log', `  ☑️  Applicable To: ${item}`);
                    }
                }
            }
            await page.waitForTimeout(300);

            // Description
            const description = wf.description ?? `Auto-created workflow - ${wf.name}`;
            await frame.locator('#txtDescription').fill(description);
            automationEvents.emit('log', `  📝 Description: ${description}`);
            await page.waitForTimeout(300);

            // Dismiss any tooltip overlay that might be lingering
            await frame.locator('body').click({ position: { x: 10, y: 10 }, force: true });
            await page.waitForTimeout(300);

            // Review Required? (default is Yes/checked)
            if (wf.reviewRequired === false) {
                // Click the LABEL for "No" to avoid overlay interception on the radio input
                await frame.locator('label[for="rbtNo"]').click({ force: true });
                automationEvents.emit('log', `  📝 Review Required: No`);
            } else {
                // "Yes" is already the default (checked="checked"), no click needed
                automationEvents.emit('log', `  📝 Review Required: Yes (default)`);
            }
            await page.waitForTimeout(500);

            // ===================== REVIEW WORKFLOW SECTION =====================
            if (wf.reviewRequired !== false) {
                automationEvents.emit('log', `  📋 Filling Review Workflow (mandatory fields)...`);

                // 1) Select at least one review group (MANDATORY)
                if (wf.reviewGroups && wf.reviewGroups.length > 0) {
                    await selectGroupsInListbox(frame, '#lstReviewer', '#btnRAdd', wf.reviewGroups, page);
                    automationEvents.emit('log', `  👥 Review groups selected: ${wf.reviewGroups.join(', ')}`);
                } else {
                    // Auto-select the first available group
                    const firstOption = frame.locator('#lstReviewer option').nth(1);
                    if (await firstOption.count() > 0) {
                        const groupText = await firstOption.textContent() || 'Second group';
                        await frame.locator('#lstReviewer').selectOption({ index: 1 });
                        await page.waitForTimeout(300);
                        await frame.locator('#btnRAdd').click();
                        await page.waitForTimeout(500);
                        automationEvents.emit('log', `  👥 Review group auto-selected: ${groupText.trim()}`);
                    }
                }

                // 2) Fill Review Grid Row 1 — ALL fields mandatory
                const reviewStep = wf.reviewSteps?.[0] ?? {};

                // Click the styled Reviewers input to open the selection popup
                automationEvents.emit('log', `  👤 Opening Reviewers selection popup...`);
                await frame.locator('#grvReview_ctl02_txtGroupUser').click();
                await page.waitForTimeout(500); // Give popup time to appear

                automationEvents.emit('log', `  👤 Selecting first group in the popup...`);
                await frame.locator('#grvWorkFlowGroup_ctl02_chkGroupSel').click();

                automationEvents.emit('log', `  💾 Saving Reviewers selection...`);
                await frame.locator('#btnESave').click();
                await page.waitForTimeout(300);

                // Functional Role (MANDATORY) — select first non-empty option
                const reviewFrDropdown = frame.locator('#grvReview_ctl02_ddlFunctionalRole');
                if (reviewStep.functionalRole) {
                    await reviewFrDropdown.selectOption({ label: reviewStep.functionalRole });
                    automationEvents.emit('log', `  🎭 Review Functional Role: ${reviewStep.functionalRole}`);
                } else {
                    // Select first non-"Select" option
                    const frOptions = frame.locator('#grvReview_ctl02_ddlFunctionalRole option');
                    const frCount = await frOptions.count();
                    for (let i = 0; i < frCount; i++) {
                        const text = await frOptions.nth(i).textContent();
                        if (text && text.trim() !== 'Select' && text.trim() !== '') {
                            await reviewFrDropdown.selectOption({ index: i });
                            automationEvents.emit('log', `  🎭 Review Functional Role: ${text.trim()} (auto)`);
                            break;
                        }
                    }
                }
                await page.waitForTimeout(300);

                // Review Period in Days (MANDATORY)
                const reviewPeriod = String(reviewStep.periodDays ?? 30);
                await frame.locator('#grvReview_ctl02_txtTenure').fill(reviewPeriod);
                automationEvents.emit('log', `  📅 Review Period: ${reviewPeriod} day(s)`);

                // Frequency in Days (MANDATORY)
                const reviewFreq = String(reviewStep.frequencyDays ?? 15);
                await frame.locator('#grvReview_ctl02_txtAlert').fill(reviewFreq);
                automationEvents.emit('log', `  🔔 Review Frequency: ${reviewFreq} day(s)`);

                // Serial/Parallel (MANDATORY)
                const reviewSP = reviewStep.serialParallel ?? 'Serial';
                await frame.locator('#grvReview_ctl02_ddlSerial').selectOption({ label: reviewSP });
                automationEvents.emit('log', `  ⚙️  Review Serial/Parallel: ${reviewSP}`);
            }
            await page.waitForTimeout(300);

            // ===================== APPROVAL WORKFLOW SECTION =====================
            automationEvents.emit('log', `  📋 Filling Approval Workflow (mandatory fields)...`);

            // 1) Select at least one approval group (MANDATORY)
            if (wf.approvalGroups && wf.approvalGroups.length > 0) {
                await selectGroupsInListbox(frame, '#lstApAvailbleUser', '#btnAAdd', wf.approvalGroups, page);
                automationEvents.emit('log', `  👥 Approval groups selected: ${wf.approvalGroups.join(', ')}`);
            } else {
                // Auto-select the first available group
                const firstApOption = frame.locator('#lstApAvailbleUser option').nth(1);
                if (await firstApOption.count() > 0) {
                    const groupText = await firstApOption.textContent() || 'Second group';
                    await frame.locator('#lstApAvailbleUser').selectOption({ index: 1 });
                    await page.waitForTimeout(300);
                    await frame.locator('#btnAAdd').click();
                    await page.waitForTimeout(500);
                    automationEvents.emit('log', `  👥 Approval group auto-selected: ${groupText.trim()}`);
                }
            }

            // 2) Fill Approval Grid Row 1 — ALL fields mandatory
            const approvalStep = wf.approvalSteps?.[0] ?? {};

            // Click the styled Approvers input to open the selection popup
            automationEvents.emit('log', `  👤 Opening Approvers selection popup...`);
            await frame.locator('#grvApprove_ctl02_txtGroupUser').click();
            await page.waitForTimeout(500); // Give popup time to appear

            automationEvents.emit('log', `  👤 Selecting first group in the popup...`);
            await frame.locator('#grvWorkFlowGroup_ctl02_chkGroupSel').click();

            automationEvents.emit('log', `  💾 Saving Approvers selection...`);
            await frame.locator('#btnESave').click();
            await page.waitForTimeout(300);

            // Functional Role (MANDATORY)
            const approveFrDropdown = frame.locator('#grvApprove_ctl02_ddlFunctionalRole');
            if (approvalStep.functionalRole) {
                await approveFrDropdown.selectOption({ label: approvalStep.functionalRole });
                automationEvents.emit('log', `  🎭 Approval Functional Role: ${approvalStep.functionalRole}`);
            } else {
                const apFrOptions = frame.locator('#grvApprove_ctl02_ddlFunctionalRole option');
                const apFrCount = await apFrOptions.count();
                for (let i = 0; i < apFrCount; i++) {
                    const text = await apFrOptions.nth(i).textContent();
                    if (text && text.trim() !== 'Select' && text.trim() !== '') {
                        await approveFrDropdown.selectOption({ index: i });
                        automationEvents.emit('log', `  🎭 Approval Functional Role: ${text.trim()} (auto)`);
                        break;
                    }
                }
            }
            await page.waitForTimeout(300);

            // Approval Period in Days (MANDATORY)
            const approvalPeriod = String(approvalStep.periodDays ?? 30);
            await frame.locator('#grvApprove_ctl02_txtTenure').fill(approvalPeriod);
            automationEvents.emit('log', `  📅 Approval Period: ${approvalPeriod} day(s)`);

            // Frequency in Days (MANDATORY)
            const approvalFreq = String(approvalStep.frequencyDays ?? 15);
            await frame.locator('#grvApprove_ctl02_txtAlert').fill(approvalFreq);
            automationEvents.emit('log', `  🔔 Approval Frequency: ${approvalFreq} day(s)`);

            // Serial/Parallel (MANDATORY)
            const approvalSP = approvalStep.serialParallel ?? 'Serial';
            await frame.locator('#grvApprove_ctl02_ddlSerial').selectOption({ label: approvalSP });
            automationEvents.emit('log', `  ⚙️  Approval Serial/Parallel: ${approvalSP}`);

            await page.waitForTimeout(300);

            // ===================== SUBMIT =====================
            automationEvents.emit('log', `  💾 Submitting workflow...`);
            await frame.locator('#btnSubmit').click();
            await waitForOverlayGone(page, 15000);

            // ===================== POPUP DETECTION =====================
            const successPopup = frame.locator('#btnMessageOk');
            const duplicatePopup = frame.locator('#val1_lblErrorAlert');

            const popupAppeared = await Promise.race([
                successPopup.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'success'),
                duplicatePopup.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'duplicate')
            ]).catch(() => 'none');

            if (popupAppeared === 'duplicate') {
                automationEvents.emit('log', `  ⚠️  Duplicate detected for workflow: ${wf.name}`);
                await frame.locator('#val1_btnerrorok').click().catch(() => { });
                results.push({
                    workflow: wf.name,
                    status: 'skipped',
                    reason: 'Workflow name already exists'
                });
                continue;
            }

            // ===================== SUCCESS =====================
            automationEvents.emit('log', `  ✅ Workflow created (popup=${popupAppeared}): ${wf.name}`);
            await frame.locator('#btnMessageOk').click().catch(() => { });

            results.push({
                workflow: wf.name,
                description,
                applicableTo: wf.applicableTo ?? [],
                reviewRequired: wf.reviewRequired !== false,
                status: 'created',
                popup: popupAppeared,
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            automationEvents.emit('error', `Workflow creation failed for ${wf.name}: ${String(err)}`);
            results.push({
                workflow: wf.name,
                status: 'error',
                message: String(err)
            });
        }
    }

    return results;
}

/**
 * Helper: Select item(s) in an "Available Group" multi-select listbox
 * and click the ">" button to move them to "Selected Groups".
 */
async function selectGroupsInListbox(
    frame: FrameLocator,
    listboxSelector: string,
    addBtnSelector: string,
    groupNames: string[],
    page: Page
) {
    const listbox = frame.locator(listboxSelector);
    await listbox.waitFor({ state: 'visible', timeout: 8000 });

    for (const groupName of groupNames) {
        // Select the option by visible text
        try {
            await listbox.selectOption({ label: groupName });
            await page.waitForTimeout(300);
        } catch {
            // Try partial text match
            const options = listbox.locator('option');
            const count = await options.count();
            for (let i = 0; i < count; i++) {
                const text = await options.nth(i).textContent();
                if (text && text.trim().includes(groupName)) {
                    await options.nth(i).click();
                    break;
                }
            }
        }
    }

    // Click the ">" button to move selected items
    await frame.locator(addBtnSelector).click();
    await page.waitForTimeout(500);
}
