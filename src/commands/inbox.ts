import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { output, success, handleError } from '../utils/response.js';

export function registerInboxCommand(cli: Argv): void {
  cli.command(
    'inbox',
    'List notifications from your Linear inbox',
    (yargs) =>
      yargs
        .option('unread', {
          type: 'boolean',
          alias: 'u',
          description: 'Show only unread notifications',
          default: false,
        })
        .option('limit', {
          type: 'number',
          alias: 'l',
          description: 'Maximum number of notifications to return',
          default: 50,
        }),
    async (argv) => {
      try {
        const client = createLinearClient();

        const notifications = await client.getNotifications({
          unreadOnly: argv.unread,
          limit: argv.limit,
        });

        // Count unread
        const unreadCount = notifications.filter((n) => !n.readAt).length;

        output(
          success('inbox', {
            count: notifications.length,
            unreadCount,
            notifications,
          })
        );
      } catch (err) {
        handleError('inbox', err);
      }
    }
  );
}
