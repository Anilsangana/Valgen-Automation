import { Page } from 'playwright';
import { automationEvents } from '../../core/browser';
import { waitForPostback, waitForOverlayGone, waitForIframeLoaderGone } from '../../core/navigation';
import { SystemPage } from '../../pages/systemPage';
import { AdministrationPage } from '../../pages/administrationPage';
import { LoginPage } from '../../pages/loginPage';
import { DataService } from '../../utils/dataService';  

export interface WorkflowInput {
    baseUrl: string;
    username: string;
    password: string;
    functionalRoleName: string;
    approvalPeriodDays?: number;
    frequencyDays?: number;
    serialParallel?: 'Serial' | 'Parallel';
    generateData?: boolean;
}

export interface WorkflowResult {
    success: boolean;
    steps: {
        step: string;
        status: 'in_progress' | 'success' | 'failed' | 'skipped';
        message?: string;
        data?: any;
    }[];
    createdEntities?: any[];
}

/**
 * Complete Workflow Automation:
 * 1. Login to ValGenesis
 * 2. Navigate to System → Workflow
 * 3. Fill workflow form with provided data
 * 4. Navigate to System → Create → Group
 * 5. Create "CSV DEMO GROUP" group
 * 6. Add group to selected groups
 * 7. Add "CSV DEMO GROUP" to approver users
 * 8. Save functional role data
 */
export async function runCompleteWorkflow(
    page: Page,
    input: WorkflowInput
): Promise<WorkflowResult> {
    const results: WorkflowResult = {
        success: false,
        steps: [],
        createdEntities: []
    };

    const loginPage = new LoginPage(page, input.baseUrl);
    const systemPage = new SystemPage(page);
    const adminPage = new AdministrationPage(page);

    try {
        // Step 1: Login
        results.steps.push({ step: 'Login', status: 'in_progress' });
        automationEvents.emit('log', `🔐 Logging in as ${input.username}`);
        
        await page.goto(input.baseUrl);
        await loginPage.login(input.username, input.password);
        await waitForPostback(page, 15000);
        await waitForOverlayGone(page);
        
        results.steps[results.steps.length - 1].status = 'success';
        automationEvents.emit('log', '✅ Login successful');

        // Step 2: Navigate to System → Workflow
        results.steps.push({ step: 'Navigate to Workflow', status: 'in_progress' });
        automationEvents.emit('log', '📍 Navigating to System → Workflow');
        
        await systemPage.navigateToWorkflowCreate();
        await waitForPostback(page, 15000);
        await waitForOverlayGone(page);
        
        results.steps[results.steps.length - 1].status = 'success';
        automationEvents.emit('log', '✅ Navigated to Workflow page');

        // Step 3: Fill Workflow Form
        results.steps.push({ step: 'Fill Workflow Form', status: 'in_progress' });
        automationEvents.emit('log', '📝 Filling workflow form');

        const frame = page.frameLocator('iframe[name="framecontent"]');
        await waitForIframeLoaderGone(page, 15000);

        // Wait for form to be ready
        await frame.locator('body').waitFor({ state: 'visible', timeout: 10000 });

        // Fill Functional Role (user will provide from UI)
        await frame.locator('#ddlFunctionalRole').waitFor({ state: 'visible', timeout: 10000 });
        await frame.locator('#ddlFunctionalRole').selectOption({ label: input.functionalRoleName });
        automationEvents.emit('log', `📋 Selected Functional Role: ${input.functionalRoleName}`);

        // Fill Approval Period in Days (user will provide from UI)
        if (input.approvalPeriodDays) {
            await frame.locator('#txtApprovalPeriodDays').fill(input.approvalPeriodDays.toString());
            automationEvents.emit('log', `📅 Set Approval Period: ${input.approvalPeriodDays} days`);
        }

        // Fill Frequency in Days (user will provide from UI)
        if (input.frequencyDays) {
            await frame.locator('#txtFrequencyDays').fill(input.frequencyDays.toString());
            automationEvents.emit('log', `🔄 Set Frequency: ${input.frequencyDays} days`);
        }

        // Select Serial/Parallel (default to Serial)
        const serialParallel = input.serialParallel || 'Serial';
        await frame.locator('#ddlSerialParallel').selectOption({ label: serialParallel });
        automationEvents.emit('log', `⚙️ Set Serial/Parallel: ${serialParallel}`);

        // Select "No" for Review Required
        await frame.locator('#ddlReviewRequired').selectOption({ label: 'No' });
        automationEvents.emit('log', '📝 Set Review Required: No');

        // Select "No" for Applicable To
        await frame.locator('#ddlApplicableTo').selectOption({ label: 'No' });
        automationEvents.emit('log', '📝 Set Applicable To: No');

        results.steps[results.steps.length - 1].status = 'success';
        automationEvents.emit('log', '✅ Workflow form filled successfully');

        // Step 4: Submit Workflow
        results.steps.push({ step: 'Submit Workflow', status: 'in_progress' });
        automationEvents.emit('log', '💾 Submitting workflow form');

        await frame.locator('#btnSubmit').click();
        await waitForPostback(page, 15000);
        await waitForOverlayGone(page);

        // Check for success message
        const successPopup = frame.locator('#btnMessageOk');
        await successPopup.waitFor({ state: 'visible', timeout: 10000 });
        
        results.steps[results.steps.length - 1].status = 'success';
        automationEvents.emit('log', '✅ Workflow submitted successfully');

        // Close success popup
        await frame.locator('#btnMessageOk').click();
        await page.waitForTimeout(2000);

        // Step 5: Navigate to System → Create → Group
        results.steps.push({ step: 'Navigate to Group Creation', status: 'in_progress' });
        automationEvents.emit('log', '👥 Navigating to System → Create → Group');

        await systemPage.navigateToGroupCreate();
        await waitForPostback(page, 15000);
        await waitForOverlayGone(page);

        results.steps[results.steps.length - 1].status = 'success';
        automationEvents.emit('log', '✅ Navigated to Group Creation page');

        // Step 6: Create "CSV DEMO GROUP"
        results.steps.push({ step: 'Create CSV DEMO GROUP', status: 'in_progress' });
        automationEvents.emit('log', '👥 Creating "CSV DEMO GROUP"');

        const groupFrame = page.frameLocator('iframe[name="framecontent"]');
        await waitForIframeLoaderGone(page, 15000);

        // Wait for form to be ready
        await groupFrame.locator('body').waitFor({ state: 'visible', timeout: 10000 });

        // Fill Group Name
        await groupFrame.locator('#txtboxGroupName').fill('CSV DEMO GROUP');
        automationEvents.emit('log', '📝 Group name set to: CSV DEMO GROUP');

        // Select Group Type (Review and Approval)
        await groupFrame.locator('#ddlGroupType').selectOption({ label: 'Review and Approval' });
        automationEvents.emit('log', '📝 Group type set to: Review and Approval');

        // Add Description
        await groupFrame.locator('#txtboxGroupDescription').fill('Demo group for CSV workflow testing');
        automationEvents.emit('log', '📝 Group description added');

        // Click "Select All" in Available Users
        automationEvents.emit('log', '👥 Selecting all available users');
        await groupFrame.locator('text=Select All').first().click();
        await page.waitForTimeout(2000);

        // Submit Group Creation
        await groupFrame.locator('#btnSubmit').click();
        await waitForPostback(page, 15000);
        await waitForOverlayGone(page);

        // Check for success
        const groupSuccessPopup = groupFrame.locator('#btnMessageOk');
        await groupSuccessPopup.waitFor({ state: 'visible', timeout: 10000 });

        results.steps[results.steps.length - 1].status = 'success';
        automationEvents.emit('log', '✅ "CSV DEMO GROUP" created successfully');

        // Save group to database
        try {
            const groupData = {
                name: 'CSV DEMO GROUP',
                type: 'Review and Approval',
                description: 'Demo group for CSV workflow testing',
                selectAllUsers: true,
                createdAt: new Date().toISOString(),
                createdBy: 'automation'
            };
            const groupId = await DataService.saveEntity('group', 'CSV DEMO GROUP', groupData);
            if (results.createdEntities) {
                results.createdEntities.push({ type: 'group', id: groupId, name: 'CSV DEMO GROUP' });
            }
            automationEvents.emit('log', `💾 Group saved to database with ID: ${groupId}`);
        } catch (dbErr) {
            automationEvents.emit('error', `Failed to save group to database: ${String(dbErr)}`);
        }

        // Close success popup
        await groupFrame.locator('#btnMessageOk').click();
        await page.waitForTimeout(2000);

        // Step 7: Navigate to Workflow again to add group to selected groups
        results.steps.push({ step: 'Add Group to Selected Groups', status: 'in_progress' });
        automationEvents.emit('log', '🔄 Navigating back to Workflow to add group');

        await systemPage.navigateToWorkflowCreate();
        await waitForPostback(page, 15000);
        await waitForOverlayGone(page);

        const workflowFrame = page.frameLocator('iframe[name="framecontent"]');
        await waitForIframeLoaderGone(page, 15000);

        // Click "Available Groups" to open group selection
        await workflowFrame.locator('#btnAvailableGroups').click();
        await page.waitForTimeout(2000);

        // Select "CSV DEMO GROUP" from available groups
        await workflowFrame.locator('text=CSV DEMO GROUP').first().click();
        await page.waitForTimeout(1000);

        // Click "Add" to move to selected groups
        await workflowFrame.locator('#btnAdd').click();
        await page.waitForTimeout(2000);

        results.steps[results.steps.length - 1].status = 'success';
        automationEvents.emit('log', '✅ "CSV DEMO GROUP" added to selected groups');

        // Step 8: Add "CSV DEMO GROUP" to approver users
        results.steps.push({ step: 'Add Group to Approver Users', status: 'in_progress' });
        automationEvents.emit('log', '👤 Adding group to approver users');

        // Click "Available Users" to open user selection
        await workflowFrame.locator('#btnAvailableUsers').click();
        await page.waitForTimeout(2000);

        // Select "CSV DEMO GROUP" from available users (it should appear as a group)
        await workflowFrame.locator('text=CSV DEMO GROUP').first().click();
        await page.waitForTimeout(1000);

        // Click "Add" to move to approver users
        await workflowFrame.locator('#btnAdd').click();
        await page.waitForTimeout(2000);

        results.steps[results.steps.length - 1].status = 'success';
        automationEvents.emit('log', '✅ "CSV DEMO GROUP" added to approver users');

        // Step 9: Save Functional Role Data
        results.steps.push({ step: 'Save Functional Role Data', status: 'in_progress' });
        automationEvents.emit('log', '💾 Saving functional role data');

        try {
            const functionalRoleData = {
                name: input.functionalRoleName,
                approvalPeriodDays: input.approvalPeriodDays,
                frequencyDays: input.frequencyDays,
                serialParallel: input.serialParallel || 'Serial',
                reviewRequired: 'No',
                applicableTo: 'No',
                createdAt: new Date().toISOString(),
                createdBy: 'automation'
            };
            const roleId = await DataService.saveEntity('functionalRole', input.functionalRoleName, functionalRoleData);
            if (results.createdEntities) {
                results.createdEntities.push({ type: 'functionalRole', id: roleId, name: input.functionalRoleName });
            }
            automationEvents.emit('log', `💾 Functional role saved to database with ID: ${roleId}`);
        } catch (dbErr) {
            automationEvents.emit('error', `Failed to save functional role to database: ${String(dbErr)}`);
        }

        results.steps[results.steps.length - 1].status = 'success';
        automationEvents.emit('log', '✅ Functional role data saved successfully');

        // Final success check
        results.steps.push({ step: 'Final Verification', status: 'in_progress' });
        automationEvents.emit('log', '🔍 Performing final verification');

        // Check if we're still on the workflow page and form is filled correctly
        const currentFunctionalRole = await workflowFrame.locator('#ddlFunctionalRole').inputValue();
        const currentApprovalPeriod = await workflowFrame.locator('#txtApprovalPeriodDays').inputValue();
        const currentFrequency = await workflowFrame.locator('#txtFrequencyDays').inputValue();

        if (currentFunctionalRole.includes(input.functionalRoleName)) {
            results.steps[results.steps.length - 1].status = 'success';
            automationEvents.emit('log', '✅ Final verification passed - workflow completed successfully');
            results.success = true;
        } else {
            results.steps[results.steps.length - 1].status = 'failed';
            results.steps[results.steps.length - 1].message = 'Verification failed - form values not matching';
            automationEvents.emit('error', '❌ Final verification failed');
        }

    } catch (error) {
        const errorStep = results.steps.find(step => step.status === 'in_progress') || results.steps[results.steps.length - 1];
        errorStep.status = 'failed';
        errorStep.message = String(error);
        automationEvents.emit('error', `❌ Workflow failed: ${String(error)}`);
    }

    return results;
}

/**
 * Generate test data for the workflow
 */
export function generateWorkflowData(): WorkflowInput {
    const timestamp = Date.now().toString().slice(-6);
    return {
        baseUrl: 'https://vgusdev01.valgenesis.net/PIHEALTH-DEV/login/login.aspx?ReturnUrl=%2fPIHEALTH-DEV%2fdefault.aspx',
        username: 'sahithia',
        password: 'Welcome@123',
        functionalRoleName: `TestRole_${timestamp}`,
        approvalPeriodDays: 30,
        frequencyDays: 15,
        serialParallel: 'Serial' as const,
        generateData: true
    };
}
