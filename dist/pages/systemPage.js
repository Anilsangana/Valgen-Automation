"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemPage = void 0;
/**
 * Page Object for the System module in ValGenesis / PiHealth.
 * Mirrors the pattern used by AdministrationPage.
 */
class SystemPage {
    constructor(page) {
        this.page = page;
        // System module link in the sidebar
        this.systemButton = page.getByRole('link', { name: ' System' });
        // "Create" tab inside the System mega-menu
        this.createTab = page.locator('[id="VM000"]', { hasText: 'Create' });
        // Category option inside the Create sub-menu
        this.categoryCreationButton = page.getByText('Create Category for a site, the first highest level of categorizing entities');
        // Sub Category option inside the Create sub-menu
        this.subCategoryCreationButton = page.getByText('Create Sub Category within a Category, the second highest level of categorizing');
        // Group option inside the Create sub-menu
        this.groupCreationButton = page.getByText('Create a Group of available Users which can be applied for multiple objects');
    }
    /**
     * Navigates to System → Create → Category.
     */
    async navigateToCategoryCreate() {
        await this.systemButton.click();
        await this.page.waitForLoadState('load');
        await this.createTab.hover();
        await this.page.waitForTimeout(500);
        await Promise.all([
            this.page.waitForLoadState('load'),
            this.categoryCreationButton.click()
        ]);
        await this.page.waitForTimeout(800);
    }
    /**
     * Navigates to System → Create → Sub Category.
     */
    async navigateToSubCategoryCreate() {
        await this.systemButton.click();
        await this.page.waitForLoadState('load');
        await this.createTab.hover();
        await this.page.waitForTimeout(500);
        await Promise.all([
            this.page.waitForLoadState('load'),
            this.subCategoryCreationButton.click()
        ]);
        await this.page.waitForTimeout(800);
    }
    /**
     * Navigates to System → Create → Group.
     */
    async navigateToGroupCreate() {
        await this.systemButton.click();
        await this.page.waitForLoadState('load');
        await this.createTab.hover();
        await this.page.waitForTimeout(500);
        await Promise.all([
            this.page.waitForLoadState('load'),
            this.groupCreationButton.click()
        ]);
        await this.page.waitForTimeout(800);
    }
    /**
     * Navigates to System → Create → Functional Role.
     */
    async navigateToFunctionalRoleCreate() {
        await this.systemButton.click();
        await this.page.waitForLoadState('load');
        await this.createTab.hover();
        await this.page.waitForTimeout(500);
        const functionalRoleCreationButton = this.page.getByText('Create Functional Role to indicate Reason for Signature when completing review o...');
        await Promise.all([
            this.page.waitForLoadState('load'),
            functionalRoleCreationButton.click()
        ]);
        await this.page.waitForTimeout(800);
    }
    /**
     * Navigates to System → Workflow.
     */
    async navigateToWorkflow() {
        await this.systemButton.click();
        await this.page.waitForLoadState('load');
        // Find and click Workflow menu item
        const workflowButton = this.page.getByText('Workflow');
        await workflowButton.click();
        await this.page.waitForTimeout(800);
    }
}
exports.SystemPage = SystemPage;
