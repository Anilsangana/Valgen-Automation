import { Page, Frame } from 'playwright';
import { automationEvents } from './browser';

export async function waitForPostback(page: Page, timeout = 30000) {
  // ASP.NET often does full postbacks. Wait for DOMContentLoaded or network idle.
  try {
    await page.waitForLoadState('load', { timeout });
    // extra wait for overlays
    await page.waitForTimeout(500);
  } catch (err) {
    automationEvents.emit('log', `waitForPostback timeout or error: ${String(err)}`);
  }
}

export async function waitForOverlayGone(page: Page, overlaySelector = '.loading-overlay, .blockUI', timeout = 30000) {
  try {
    await page.waitForSelector(overlaySelector, { state: 'hidden', timeout });
  } catch (err) {
    // it's okay if overlay not found
  }
}

export async function switchToIframeIfPresent(page: Page, iframeSelector: string): Promise<Frame | null> {
  const frameElem = await page.$(iframeSelector);
  if (!frameElem) return null;
  const frame = await frameElem.contentFrame();
  return frame || null;
}

export async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      automationEvents.emit('log', `Retry ${i + 1} failed: ${String(err)}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
