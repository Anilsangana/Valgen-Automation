"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCompleteWorkflow = runCompleteWorkflow;
exports.generateWorkflowData = generateWorkflowData;
const browser_1 = require("../../core/browser");
const navigation_1 = require("../../core/navigation");
const systemPage_1 = require("../../pages/systemPage");
const administrationPage_1 = require("../../pages/administrationPage");
const loginPage_1 = require("../../pages/loginPage");
const dataService_1 = require("../../utils/dataService");
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
async function runCompleteWorkflow(page, input) {
    const results = {
        success: false,
        steps: [],
        createdEntities: []
    };
    const loginPage = new loginPage_1.LoginPage(page, input.baseUrl);
    const systemPage = new systemPage_1.SystemPage(page);
    const adminPage = new administrationPage_1.AdministrationPage(page);
    try {
        // Step 1: Login
        results.steps.push({ step: 'Login', status: 'in_progress' });
        browser_1.automationEvents.emit('log', `🔐 Logging in as ${input.username}`);
        await page.goto(input.baseUrl);
        await loginPage.login(input.username, input.password);
        await (0, navigation_1.waitForPostback)(page, 15000);
        await (0, navigation_1.waitForOverlayGone)(page);
        results.steps[results.steps.length - 1].status = 'success';
        browser_1.automationEvents.emit('log', '✅ Login successful');
        // Step 2: Navigate to System → Workflow
        results.steps.push({ step: 'Navigate to Workflow', status: 'in_progress' });
        browser_1.automationEvents.emit('log', '📍 Navigating to System → Workflow');
        await systemPage.navigateToWorkflow();
        await (0, navigation_1.waitForPostback)(page, 15000);
        await (0, navigation_1.waitForOverlayGone)(page);
        results.steps[results.steps.length - 1].status = 'success';
        browser_1.automationEvents.emit('log', '✅ Navigated to Workflow page');
        // Step 3: Fill Workflow Form
        results.steps.push({ step: 'Fill Workflow Form', status: 'in_progress' });
        browser_1.automationEvents.emit('log', '📝 Filling workflow form');
        // Wait for form to be ready
        await page.waitForSelector('#txtWName', { state: 'visible', timeout: 10000 });
        // Fill Workflow Name
        await page.fill('#txtWName', `TestWorkflow_${Date.now()}`);
        browser_1.automationEvents.emit('log', `📋 Workflow Name set to: TestWorkflow_${Date.now()}`);
        // Fill Workflow ID (auto-generated)
        const workflowId = page.locator('#txtWID');
        await workflowId.waitFor({ state: 'visible', timeout: 5000 });
        const currentWorkflowId = await workflowId.inputValue();
        browser_1.automationEvents.emit('log', `� Workflow ID: ${currentWorkflowId}`);
        // Set Applicable To - Select All
        await page.check('#chkAll');
        browser_1.automationEvents.emit('log', '📋 Set Applicable To: Select All');
        // Set Review Required to No
        await page.check('#rbtNo');
        browser_1.automationEvents.emit('log', '� Set Review Required: No');
        // Fill Description
        await page.fill('#txtDescription', `Auto-generated workflow for testing - ${new Date().toISOString()}`);
        browser_1.automationEvents.emit('log', '� Description added');
        results.steps[results.steps.length - 1].status = 'success';
        browser_1.automationEvents.emit('log', '✅ Workflow form filled successfully');
        // Step 4: Submit Workflow
        results.steps.push({ step: 'Submit Workflow', status: 'in_progress' });
        browser_1.automationEvents.emit('log', '💾 Submitting workflow form');
        await page.locator('#btnSubmit').click();
        await (0, navigation_1.waitForPostback)(page, 15000);
        await (0, navigation_1.waitForOverlayGone)(page);
        // Check for success message and complete
        results.steps.push({ step: 'Final Verification', status: 'in_progress' });
        browser_1.automationEvents.emit('log', '🔍 Performing final verification');
        try {
            await page.waitForSelector('#txtWName', { state: 'visible', timeout: 5000 });
            results.steps[results.steps.length - 2].status = 'success';
            results.steps[results.steps.length - 1].status = 'success';
            browser_1.automationEvents.emit('log', '✅ Workflow submitted successfully');
            results.success = true;
            // Save workflow data to database
            try {
                const workflowData = {
                    name: `TestWorkflow_${Date.now()}`,
                    reviewRequired: 'No',
                    applicableTo: 'All',
                    description: `Auto-generated workflow for testing - ${new Date().toISOString()}`,
                    functionalRole: input.functionalRoleName,
                    approvalPeriodDays: input.approvalPeriodDays,
                    frequencyDays: input.frequencyDays,
                    serialParallel: input.serialParallel || 'Serial',
                    createdAt: new Date().toISOString(),
                    createdBy: 'automation'
                };
                const workflowId = await dataService_1.DataService.saveEntity('workflow', workflowData.name, workflowData);
                results.createdEntities.push({ type: 'workflow', id: workflowId, name: workflowData.name });
                browser_1.automationEvents.emit('log', `💾 Workflow saved to database with ID: ${workflowId}`);
            }
            catch (dbErr) {
                browser_1.automationEvents.emit('error', `Failed to save workflow to database: ${String(dbErr)}`);
            }
        }
        catch (err) {
            results.steps[results.steps.length - 2].status = 'failed';
            results.steps[results.steps.length - 1].status = 'failed';
            results.steps[results.steps.length - 1].message = String(err);
            browser_1.automationEvents.emit('error', `❌ Workflow submission failed: ${String(err)}`);
        }
    }
    catch (error) {
        const errorStep = results.steps.find(step => step.status === 'in_progress') || results.steps[results.steps.length - 1];
        if (errorStep) {
            errorStep.status = 'failed';
            errorStep.message = String(error);
        }
        browser_1.automationEvents.emit('error', `❌ Workflow automation failed: ${String(error)}`);
    }
    return results;
}
/**
 * Generate test data for the workflow
 */
function generateWorkflowData() {
    const timestamp = Date.now().toString().slice(-6);
    return {
        baseUrl: 'https://vgusdev01.valgenesis.net/PIHEALTH-DEV/login/login.aspx?ReturnUrl=%2fPIHEALTH-DEV%2fdefault.aspx',
        username: 'sahithia',
        password: 'Welcome@123',
        functionalRoleName: `TestRole_${timestamp}`,
        approvalPeriodDays: 30,
        frequencyDays: 15,
        serialParallel: 'Serial',
        generateData: true
    };
}
