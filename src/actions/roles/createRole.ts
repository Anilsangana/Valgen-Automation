import { Page } from 'playwright';

import { automationEvents } from '../../core/browser';

import { waitForPostback, waitForOverlayGone } from '../../core/navigation';

import { AdministrationPage } from '../../pages/administrationPage';



export type CreateRoleOptions = {

  duplicateStrategy?: 'skip' | 'append' | 'stop';



  /**

   * Whether to save permissions after role creation.

   * Defaults to true.

   */

  configurePermissions?: boolean;

};



async function configureRolePermissions(

  frame: ReturnType<Page['frameLocator']>,

  page: Page,

  roleName: string

): Promise<void> {



  automationEvents.emit('log', 'Saving role permissions');

  await page.mouse.move(1, 1);


  await frame.locator('body').waitFor({ state: 'visible', timeout: 10000 });



  const comment = `Permissions saved automatically for role "${roleName}" during creation`;

  await frame.locator('#txtComments').fill(comment);

  await page.waitForTimeout(1000);

  await frame.locator('#btnSave').click();

  await page.waitForTimeout(1000);

  await page.waitForLoadState('domcontentloaded');

  const successMessage = frame.locator('#val1_lblCM', { hasText: 'Role Profile has been Updated' })

  await successMessage.waitFor({ state: 'visible', timeout: 8000 });

  if (successMessage) {

    automationEvents.emit('log', 'Permissions saved successfully');

  }

  if (!successMessage) {

    automationEvents.emit('log', 'Failed to assign Permissions');

  }

  await page.waitForTimeout(1000);

  await frame.locator('#btnMessageOk').click().catch(() => { });

  await page.waitForTimeout(1000);

  await page.waitForLoadState('domcontentloaded');

  await page.getByRole('link', { name: 'Logout' }).click();

  await page.waitForURL('https://vgusdev01.valgenesis.net/PIHEALTH-DEV/Login/Login.aspx');

}



export async function createRole(

  page: Page,

  roles: Array<{ roleName: string }>,

  options: CreateRoleOptions = {}

): Promise<any[]> {



  const results: any[] = [];

  const admin = new AdministrationPage(page);



  const strategy = options.duplicateStrategy ?? 'skip';

  const configurePermissions = options.configurePermissions ?? true;



  for (const r of roles) {

    try {

      automationEvents.emit('log', `Creating role: ${r.roleName}`);



      // ===================== Navigation =====================

      await admin.navigateToAdministration();

      await waitForPostback(page, 15000);

      await waitForOverlayGone(page);



      const frame = page.frameLocator('#framecontent');



      // ===================== Role Creation =====================

      await page.waitForTimeout(3000);
      await page.mouse.move(1, 1);

      await frame.locator('#ddlRoleType')

        .selectOption('Review and Approval');

      await page.waitForTimeout(2000);

      await frame.locator('#txtboxRoleName')

        .fill(r.roleName);

      await page.waitForTimeout(1000);

      await frame.locator('#txtBoxDesc')

        .fill(`Auto created role - ${r.roleName}`);

      await page.waitForTimeout(1000);

      await page.mouse.move(1, 1);

      await frame.locator('#btnSubmit').click();

      await page.mouse.move(1, 1);
      await page.waitForLoadState('load');



      // ===================== Popup Detection =====================

      const successPopup = frame.locator('#val1_lblCM');

      const duplicatePopup = frame.locator('#val1_lblErrorAlert', { hasText: 'Role Name must be unique' });

      const errorPopup = frame.locator('#val1_lblErrorAlertPop', { hasText: 'Enter Role Name' });



      const popupAppeared = await Promise.race([

        successPopup.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'success'),

        duplicatePopup.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'duplicate'),

        errorPopup.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'error')

      ]).catch(() => 'none');



      // ===================== Duplicate Handling =====================



      if (popupAppeared === 'error') {

        // Click OK button to dismiss error
        await frame.locator('#val1_btnerrorok').click().catch(() => { });

        // Wait for modal to close
        await page.waitForTimeout(2000);
        await page.locator('#modalBackground').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
        await page.waitForTimeout(1000);



        if (strategy === 'stop') {

          results.push({

            role: r.roleName,

            status: 'failed',

            reason: 'role name is empty'

          });

          break;

        }

      }

      if (popupAppeared === 'duplicate') {

        // Click OK button to dismiss duplicate error
        await frame.locator('#val1_btnerrorok').click().catch(() => { });

        // Wait for modal to close and background to clear
        await page.waitForTimeout(2000);
        await page.locator('#modalBackground').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
        await page.waitForTimeout(1000);



        if (strategy === 'stop') {

          results.push({

            role: r.roleName,

            status: 'failed',

            reason: 'role name is duplicate'

          });

          break;

        }



        if (strategy === 'append') {

          const newName = `${r.roleName}_${Date.now().toString().slice(-4)}`;



          await frame.locator('#txtboxRoleName').fill(newName);

          await frame.locator('#btnSubmit').click();

          await waitForPostback(page, 10000);



          await successPopup.waitFor({ state: 'visible', timeout: 8000 });



          results.push({

            original: r.roleName,

            createdAs: newName,

            status: 'created'

          });

        } else {

          results.push({

            role: r.roleName,

            status: 'skipped',

            reason: 'role name is duplicate'

          });

        }



        continue;

      }



      // ===================== Success (popup OR none) =====================

      automationEvents.emit(

        'log',

        `Role created (popup=${popupAppeared}) for: ${r.roleName}`

      );



      results.push({

        role: r.roleName,

        status: 'created',

        popup: popupAppeared

      });
      await page.waitForTimeout(2000);
      // Close success popup
      await frame.locator('#btnMessageOk').click().catch(() => { });

      // CRITICAL: Wait for modal background to fully disappear
      await page.waitForTimeout(2000);
      await page.locator('#modalBackground').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
      await page.waitForTimeout(1000);



      // ===================== Permission Save =====================

      if (configurePermissions) {

        try {

          // automationEvents.emit('log', `Applying permissions for: ${r.roleName}`);



          // await page.getByRole('link', { name: ' Administration' }).click();

          // await waitForPostback(page, 8000);



          // await page.locator('[id="AD000"]', { hasText: 'Administration' }).hover();

          // await page.locator('a', { hasText: 'Role Profiles' }).click();



          // await waitForPostback(page, 10000);

          // await waitForOverlayGone(page);



          // const permFrame = page.frameLocator('#framecontent');

          // await page.waitForTimeout(1000);

          // await page.waitForLoadState('domcontentloaded');

          // await permFrame.locator('#ddlRName')

          //   .waitFor({ state: 'visible', timeout: 8000 });



          // await permFrame.locator('#ddlRName')

          //   .selectOption({ label: r.roleName });

          // await page.waitForTimeout(1000);

          // await page.waitForLoadState('domcontentloaded');
          await page.getByRole('link', { name: 'Logout' }).click();


          // await configureRolePermissions(permFrame, page, r.roleName);



          results[results.length - 1].permissionsConfigured = true;

          results[results.length - 1].credentials.permissionsConfigured = true;



        } catch (permErr) {

          automationEvents.emit(

            'error',

            `Permission setup failed for ${r.roleName}: ${String(permErr)}`

          );



          results[results.length - 1].permissionsConfigured = false;

        }

      }



    } catch (err) {

      automationEvents.emit(

        'error',

        `Role creation failed for ${r.roleName}: ${String(err)}`

      );



      results.push({

        role: r.roleName,

        status: 'error',

        message: String(err)

      });

    }

  }



  return results;

}

