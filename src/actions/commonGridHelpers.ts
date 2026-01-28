import { Page } from 'playwright';
import { automationEvents } from '../core/browser';

export async function searchGridAndSelect(page: Page, searchText: string, gridSelector = '#grid') {
  // Generic grid helper: locate search input, type, search, then find result row and click it
  automationEvents.emit('log', `Searching grid ${gridSelector} for ${searchText}`);
  // TODO: adapt selectors according to ValGenesis grid markup
  const searchSelector = `${gridSelector} input[type="search"], ${gridSelector} .grid-search input`;
  const rowSelector = `${gridSelector} tbody tr`;

  const searchInput = await page.$(searchSelector);
  if (!searchInput) {
    automationEvents.emit('log', `Grid search input not found for ${gridSelector}`);
    return false;
  }
  await searchInput.fill('');
  await searchInput.type(searchText);
  await page.keyboard.press('Enter');

  await page.waitForTimeout(1000); // wait for refresh/postback
  const rows = await page.$$(rowSelector);
  for (const row of rows) {
    const text = await row.innerText();
    if (text.includes(searchText)) {
      await row.click();
      automationEvents.emit('log', `Selected row matching ${searchText}`);
      return true;
    }
  }
  automationEvents.emit('log', `No matching row found for ${searchText}`);
  return false;
}
