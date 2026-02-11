import { Page, Locator } from 'playwright';

export class AdministrationPage {
  readonly administratorButton: Locator;
  readonly createTab: Locator;
  readonly roleCreationButton: Locator;
  readonly page: Page;
  readonly userCreationButton: Locator;
  readonly departmentCreationButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.administratorButton = page.getByRole('link', { name: ' Administration' });
    this.userCreationButton = page.getByRole('link', {
      name: 'User Create Users to authorize access to operate the system'
    });

    // Create tab
    this.createTab = page.locator('[id="AD000"]', { hasText: 'Create' });

    // Role Create menu link
    this.roleCreationButton = page.getByRole('link', {
      name: 'Role Create Roles to manage access to functionality and data'
    });

    // Department Create menu link
    this.departmentCreationButton = page.getByRole('link', {
      name: 'Department Create Departments to identify division of an organization'
    });
  }

  async navigateToAdministration() {
    await this.administratorButton.click();
    await this.page.waitForLoadState('load');

    await this.createTab.hover();
    await this.page.waitForLoadState('domcontentloaded')

    await Promise.all([
      this.page.waitForLoadState('load'),
      this.roleCreationButton.click()
    ]);
  }
  async navigateToUserCreate() {
    await this.administratorButton.click();
    await this.page.waitForLoadState('load');

    await this.createTab.hover();
    await this.page.waitForTimeout(400);

    await Promise.all([
      this.page.waitForLoadState('load'),
      this.userCreationButton.click()
    ]);

    await this.page.waitForTimeout(800);
  }

  async navigateToDepartmentCreate() {
    await this.administratorButton.click();
    await this.page.waitForLoadState('load');

    await this.createTab.hover();
    await this.page.waitForTimeout(400);

    await Promise.all([
      this.page.waitForLoadState('load'),
      this.departmentCreationButton.click()
    ]);

    await this.page.waitForTimeout(800);
  }

}
