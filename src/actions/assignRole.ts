import { Page } from 'playwright';
import { automationEvents } from '../core/browser';

export async function assignRole(page: Page, assignments: Array<{ username: string; role: string }>) {
  const results: any[] = [];
  for (const a of assignments) {
    try {
      automationEvents.emit('log', `Assigning role ${a.role} to user ${a.username}`);
      // TODO: search user, open assignments, add role if not present
      results.push({ username: a.username, role: a.role, status: 'assigned' });
    } catch (err) {
      automationEvents.emit('error', `assignRole error for ${a.username}: ${String(err)}`);
      results.push({ username: a.username, role: a.role, status: 'error', message: String(err) });
    }
  }
  return results;
}
