import { chromium, ChromiumBrowser, BrowserContext, Page, LaunchOptions } from 'playwright';
import EventEmitter from 'events';
import fs from 'fs';

export interface BrowserOptions extends LaunchOptions {
  headless?: boolean;
  storageState?: string;
}

export async function launchBrowser(
  options: BrowserOptions = {}
): Promise<{ browser: ChromiumBrowser; context: BrowserContext }> {

  const { storageState, ...launchOptions } = options;

  const browser = await chromium.launch({
    headless: launchOptions.headless ?? false,
    ...launchOptions,
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    storageState:
      storageState && fs.existsSync(storageState)
        ? storageState
        : undefined,
  });

  return { browser, context };
}

export async function newPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  return page;
}

export const automationEvents = new EventEmitter();
