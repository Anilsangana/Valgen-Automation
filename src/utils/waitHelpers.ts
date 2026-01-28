import { Page } from 'playwright';
import { automationEvents } from '../core/browser';

export async function waitForSelectorSafe(page: Page, selector: string, timeout = 15000) {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
  } catch (err) {
    automationEvents.emit('log', `waitForSelectorSafe timeout for ${selector}`);
    throw err;
  }
}

export async function clickAndWait(page: Page, selector: string) {
  await Promise.all([page.waitForLoadState('load'), page.click(selector)]);
}
