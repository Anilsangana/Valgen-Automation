import { Page } from 'playwright';
import { automationEvents } from '../../core/browser';
import { waitForPostback, waitForOverlayGone } from '../../core/navigation';
import { AdministrationPage } from '../../pages/administrationPage';
import { createRole } from '../roles/createRole';

export type CreateUserOptions = {
  duplicateStrategy?: 'skip' | 'append' | 'stop';
};

export async function createUsers(
  page: Page,
  users: Array<{
    FirstName: string;
    LastName: string;
    UserName: string;
    Email: string;
    Password: string;
    Role?: string;
    Department?: string;
    Comments?: string;
  }>,
  options: CreateUserOptions = {}
): Promise<any[]> {

  const results: any[] = [];
  const admin = new AdministrationPage(page);
  const strategy = options.duplicateStrategy ?? 'skip';

  for (const u of users) {
    try {
      automationEvents.emit('log', `Processing user: ${u.Email}`);

      // ===================== NAVIGATION =====================
      await admin.navigateToUserCreate();
      await waitForOverlayGone(page);

      const frame = page.frameLocator('#framecontent');

      await frame.locator('#liCreateUser').click().catch(() => {});
      await frame.locator('#divCreateUser').waitFor({ state: 'visible' });

      // ===================== FORM =====================
      if (u.Role) {
            await page.waitForLoadState('domcontentloaded');
            await frame.locator('#ddlRole').selectOption({ label: u.Role });
          } else {
            results.push({ email: u.Email, status: 'failed', message: `Required role '${u.Role}' not available and could not be created` });
            continue;
          }
          // await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
          await page.waitForLoadState('domcontentloaded');

      

      if (u.Department) {
        try {
          await frame.locator('#ddlDepartment').selectOption({ label: u.Department });
        } catch (err) {
          automationEvents.emit('error', `Department '${u.Department}' not found in dropdown, skipping department selection`);
        }
      }
          await page.waitForTimeout(1000);
          await page.waitForLoadState('domcontentloaded');
      await frame.locator('#txtFirstName').fill(u.FirstName);
      automationEvents.emit('log', `Filled FirstName: ${u.FirstName}`);
      await page.waitForTimeout(500);

      await frame.locator('#txtLastName').fill(u.LastName);
      automationEvents.emit('log', `Filled LastName: ${u.LastName}`);
      await page.waitForTimeout(500);

      await frame.locator('#txtUserName').fill(u.UserName);
      automationEvents.emit('log', `Filled UserName: ${u.UserName}`);
      await page.waitForTimeout(500);

      await frame.locator('#txtEmail').fill(u.Email);
      automationEvents.emit('log', `Filled Email: ${u.Email}`);
      await page.waitForTimeout(500);

      await frame.locator('#txtREEmail').fill(u.Email);
      automationEvents.emit('log', `Filled Re-enter Email: ${u.Email}`);
      await page.waitForTimeout(500);

      await frame.locator('#txtPwd').fill(u.Password);
      automationEvents.emit('log', `Filled Password: ${u.Password}`);
      await page.waitForTimeout(500);

      await frame.locator('#txtRPwd').fill(u.Password);
      automationEvents.emit('log', `Filled Re-enter Password: ${u.Password}`);
      await page.waitForTimeout(500);

      if (u.Comments) {
        await frame.locator('#txtComments').fill(u.Comments);
      }

      // ===================== SUBMIT =====================
      automationEvents.emit('log', `Submitting user: ${u.Email}`);
      await frame.locator('#btnUpdate').click();
      await waitForPostback(page, 10000); // Wait for submit postback

      // ===================== POPUP DETECTION =====================
      automationEvents.emit('log', 'Waiting for success or duplicate popup...');

      const duplicatePopup = frame.locator('#val1_lblErrorAlert');
      const successPopup = frame.locator('#val1_pnlMessagePopup'); // success container
      const duplicateOkBtn = frame.locator('#val1_btnerrorok');

      // Wait a bit for any popup to appear
      await page.waitForTimeout(2000);

      // Debug: Check what elements are visible
      try {
        const successVisible = await successPopup.isVisible();
        const duplicateVisible = await duplicatePopup.isVisible();
        automationEvents.emit('log', `Debug - Success popup visible: ${successVisible}, Duplicate popup visible: ${duplicateVisible}`);
      } catch (err) {
        automationEvents.emit('log', `Debug - Error checking visibility: ${String(err)}`);
      }

      // Check for success popup first (more common case)
      let successDetected = false;
      
      // Try multiple possible success popup selectors
      const successSelectors = [
        '#val1_pnlMessagePopup', // original selector
        '#val1_lblSuccessAlert', // alternative success message
        '[id*="success"]', // any element with success in id
        '[id*="Success"]', // any element with Success in id
        '.success-message', // common success class
        '.alert-success' // bootstrap success class
      ];

      for (const selector of successSelectors) {
        try {
          const popup = frame.locator(selector);
          await popup.waitFor({ state: 'visible', timeout: 3000 });
          successDetected = true;
          automationEvents.emit('log', `Success popup detected using selector: ${selector} for user: ${u.Email}`);
          break;
        } catch (err) {
          // Try next selector
        }
      }

      // If still not found, try a more general approach
      if (!successDetected) {
        try {
          // Look for any visible popup or message that might indicate success
          const allPopups = frame.locator('[id*="popup"], [id*="Popup"], [id*="alert"], [id*="Alert"], [id*="message"], [id*="Message"]');
          const count = await allPopups.count();
          automationEvents.emit('log', `Found ${count} potential popup elements`);
          
          for (let i = 0; i < count; i++) {
            const popup = allPopups.nth(i);
            if (await popup.isVisible()) {
              const text = await popup.innerText();
              automationEvents.emit('log', `Found visible popup with text: ${text}`);
              if (text.toLowerCase().includes('success') || text.toLowerCase().includes('created') || text.toLowerCase().includes('saved')) {
                successDetected = true;
                automationEvents.emit('log', `Success detected from popup text for user: ${u.Email}`);
                break;
              }
            }
          }
        } catch (err) {
          automationEvents.emit('log', `General popup search failed: ${String(err)}`);
        }
      }

      if (!successDetected) {
        automationEvents.emit('log', `Success popup not found with any selector for user: ${u.Email}`);
      }

      // If no success popup, check for duplicate popup
      let duplicateDetected = false;
      if (!successDetected) {
        try {
          await duplicatePopup.waitFor({ state: 'visible', timeout: 10000 });
          duplicateDetected = true;
          automationEvents.emit('log', `Duplicate popup detected for user: ${u.Email}`);
        } catch (err) {
          automationEvents.emit('log', `Duplicate popup not found within timeout: ${String(err)}`);
          // No duplicate popup found
        }
      }

      // ===================== DUPLICATE =====================
      if (duplicateDetected) {
        const msg = (await duplicatePopup.innerText()).trim();
        automationEvents.emit('error', `Duplicate user detected: ${msg}`);

        await duplicateOkBtn.click().catch(() => {});

        if (strategy === 'stop') {
          results.push({ email: u.Email, status: 'failed', reason: msg });
          break;
        }

        if (strategy === 'append') {
          const suffix = Date.now().toString().slice(-4);
          const newUser = `${u.UserName}_${suffix}`;
          const newEmail = u.Email.replace('@', `_${suffix}@`);

          automationEvents.emit('log', `Retrying with ${newEmail}`);

          await frame.locator('#txtUserName').fill(newUser);
          await frame.locator('#txtEmail').fill(newEmail);
          await frame.locator('#txtREEmail').fill(newEmail);
          await frame.locator('#btnUpdate').click();

          await successPopup.waitFor({ state: 'visible', timeout: 8000 });

          results.push({
            original: u.Email,
            createdAs: newEmail,
            status: 'created-appended'
          });
          continue;
        }
        results.push({ email: u.Email, status: 'skipped', reason: msg });
        continue;
      }

      // ===================== SUCCESS =====================
      if (successDetected) {
        automationEvents.emit('log', `User created successfully: ${u.Email}`);
        results.push({ email: u.Email, status: 'created' });
        continue;
      }

      // ===================== NOTHING =====================
      automationEvents.emit('error', `No popup detected for user: ${u.Email}`);
      results.push({
        email: u.Email,
        status: 'error',
        message: 'No success or duplicate popup detected'
      });

    } catch (err) {
      automationEvents.emit(
        'error',
        `createUsers error for ${u.Email}: ${String(err)}`
      );

      results.push({
        email: u.Email,
        status: 'error',
        message: String(err)
      });
    }
  }

  return results;
}