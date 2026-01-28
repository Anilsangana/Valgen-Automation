import { Page } from 'playwright';
import { automationEvents } from '../core/browser';

export async function createDepartment(page: Page, departments: Array<{ name: string }>) {
  const results: any[] = [];
  for (const d of departments) {
    try {
      automationEvents.emit('log', `Processing department: ${d.name}`);
      // TODO: implement search and create
      results.push({ department: d.name, status: 'created' });
    } catch (err) {
      automationEvents.emit('error', `createDepartment error for ${d.name}: ${String(err)}`);
      results.push({ department: d.name, status: 'error', message: String(err) });
    }
  }
  return results;
}
