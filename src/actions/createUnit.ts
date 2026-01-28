import { Page } from 'playwright';
import { automationEvents } from '../core/browser';

export async function createUnit(page: Page, units: Array<{ name: string }>) {
  const results: any[] = [];
  for (const u of units) {
    try {
      automationEvents.emit('log', `Processing unit: ${u.name}`);
      // TODO: implement search and create
      results.push({ unit: u.name, status: 'created' });
    } catch (err) {
      automationEvents.emit('error', `createUnit error for ${u.name}: ${String(err)}`);
      results.push({ unit: u.name, status: 'error', message: String(err) });
    }
  }
  return results;
}
