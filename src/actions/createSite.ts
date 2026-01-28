import { Page } from 'playwright';
import { automationEvents } from '../core/browser';

export async function createSite(page: Page, sites: Array<{ name: string }>) {
  const results: any[] = [];
  for (const s of sites) {
    try {
      automationEvents.emit('log', `Processing site: ${s.name}`);
      // TODO: implement search and create
      results.push({ site: s.name, status: 'created' });
    } catch (err) {
      automationEvents.emit('error', `createSite error for ${s.name}: ${String(err)}`);
      results.push({ site: s.name, status: 'error', message: String(err) });
    }
  }
  return results;
}
