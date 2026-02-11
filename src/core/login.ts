import { Page } from 'playwright';
import { automationEvents } from './browser';
import { LoginPage } from '../pages/loginPage';
import fs from 'fs';
import path from 'path';

const STORAGE_PATH = path.join(process.cwd(), 'auth', 'vg-storage.json');

export async function login(
  page: Page,
  baseUrl: string,
  username: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    // ===================== REUSE SESSION =====================
    if (fs.existsSync(STORAGE_PATH)) {
      automationEvents.emit('log', 'Found existing storageState → validating session');

      await page.goto(baseUrl.replace(/login\/login\.aspx.*/i, 'default.aspx'), {
        waitUntil: 'domcontentloaded',
      });

      const loggedIn = await page
        .getByRole('link', { name: 'Administration' })
        .isVisible()
        .catch(() => false);

      if (loggedIn) {
        automationEvents.emit('log', 'Session valid → skipping login');
        return { success: true, message: 'Reused existing session' };
      }

      automationEvents.emit('log', 'Session expired → performing fresh login');
    }

    // ===================== FRESH LOGIN =====================
    automationEvents.emit('log', `Navigating to login page: ${baseUrl}`);

    const loginPage = new LoginPage(page, baseUrl);
    await loginPage.navigate();
    await page.waitForLoadState('domcontentloaded');

    automationEvents.emit('log', 'Filling credentials and logging in...');
    await loginPage.login(username, password);

    // VG 4.2 is slow → be generous
    automationEvents.emit('log', 'Waiting for home page after login...');

    const commonAlertOk = page.locator('#btnCommonAlertOk');

    if (await commonAlertOk.isVisible()) {
      automationEvents.emit('log', 'Common alert found, clicking OK');
      await commonAlertOk.click();
    } else {
      automationEvents.emit('log', 'No common alert, continuing');
    }

    await Promise.race([
      page.waitForURL(/default\.aspx/i, { timeout: 35000 }),
      page.getByRole('link', { name: 'Administration' }).waitFor({ timeout: 35000 }),
    ]);

    // ===================== SAVE STORAGE STATE =====================
    await page.context().storageState({ path: STORAGE_PATH });
    automationEvents.emit('log', `storageState saved → ${STORAGE_PATH}`);

    automationEvents.emit('log', 'Login successful');
    return { success: true, message: 'Logged in and session saved' };

  } catch (err) {
    automationEvents.emit(
      'error',
      `Login failed or timed out. URL: ${page.url()} | Error: ${String(err)}`
    );
    return { success: false, message: String(err) };
  }
}

export async function loginWithNewUser(page: Page, baseUrl: string, username: string, password: string): Promise<{ success: boolean; message: string }> {
  let retries = 2;
  let lastError: any;

  while (retries >= 0) {
    try {
      // ===================== FRESH LOGIN =====================
      automationEvents.emit('log', `Navigating to login page: ${baseUrl}${retries < 2 ? ` (retry ${2 - retries}/2)` : ''}`);

      // Ensure page is ready before navigation
      await page.waitForTimeout(1000);

      const loginPage = new LoginPage(page, baseUrl);

      // Navigate with better error handling
      try {
        await loginPage.navigate();
        await page.waitForLoadState('domcontentloaded');
      } catch (navError: any) {
        if (navError.message?.includes('ERR_ABORTED') && retries > 0) {
          automationEvents.emit('log', `Navigation aborted, retrying... (${retries} retries left)`);
          retries--;
          await page.waitForTimeout(2000); // Wait before retry
          continue;
        }
        throw navError;
      }

      automationEvents.emit('log', 'Filling credentials and logging in...');
      await loginPage.loginWithNewUser(username, password);

      // VG 4.2 is slow → be generous
      automationEvents.emit('log', 'Waiting for home page after login...');

      const commonAlertOk = page.locator('#btnCommonAlertOk');

      if (await commonAlertOk.isVisible()) {
        automationEvents.emit('log', 'Common alert found, clicking OK');
        await commonAlertOk.click();
      } else {
        automationEvents.emit('log', 'No common alert, continuing');
      }

      await Promise.race([
        page.waitForURL(/default\.aspx/i, { timeout: 35000 }),
        page.getByRole('link', { name: 'Administration' }).waitFor({ timeout: 35000 }),
      ]);

      // ===================== SAVE STORAGE STATE =====================
      await page.context().storageState({ path: STORAGE_PATH });
      automationEvents.emit('log', `storageState saved → ${STORAGE_PATH}`);

      automationEvents.emit('log', 'Login successful');
      return { success: true, message: 'Logged in and session saved' };

    } catch (err) {
      lastError = err;
      if (retries > 0) {
        automationEvents.emit('log', `Login attempt failed, retrying... (${retries} retries left)`);
        retries--;
        await page.waitForTimeout(2000); // Wait before retry
      } else {
        automationEvents.emit(
          'error',
          `Login failed or timed out. URL: ${page.url()} | Error: ${String(err)}`
        );
        return { success: false, message: String(err) };
      }
    }
  }

  // If we get here, all retries failed
  return { success: false, message: String(lastError) };
}
