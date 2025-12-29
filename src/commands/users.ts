import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { output, success, handleError } from '../utils/response.js';

export function registerUsersCommand(cli: Argv): void {
  cli.command(
    'users',
    'List users',
    (yargs) =>
      yargs.option('me', {
        type: 'boolean',
        description: 'Show only current user',
      }),
    async (argv) => {
      try {
        const client = createLinearClient();

        if (argv.me) {
          const me = await client.getMe();
          output(success('users', { user: me }));
        } else {
          const users = await client.getUsers();
          output(success('users', { users }));
        }
      } catch (err) {
        handleError('users', err);
      }
    }
  );
}
