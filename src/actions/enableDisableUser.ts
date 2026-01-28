import { Page } from 'playwright';
import { automationEvents } from '../core/browser';

export async function enableDisableUser(page: Page, users: Array<{ username: string; enable: boolean }>) {
  const results: any[] = [];
  for (const u of users) {
    try {
      automationEvents.emit('log', `${u.enable ? 'Enabling' : 'Disabling'} user: ${u.username}`);
      // TODO: search user, open profile, change enabled flag, save
      results.push({ user: u.username, status: u.enable ? 'enabled' : 'disabled' });
    } catch (err) {
      automationEvents.emit('error', `enableDisableUser error for ${u.username}: ${String(err)}`);
      results.push({ user: u.username, status: 'error', message: String(err) });
    }
  }
  return results;
}
