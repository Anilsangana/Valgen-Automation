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
