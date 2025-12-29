import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { output, success, handleError } from '../utils/response.js';

export function registerTeamsCommand(cli: Argv): void {
  cli.command(
    'teams',
    'List all teams',
    (yargs) => yargs,
    async () => {
      try {
        const client = createLinearClient();
        const teams = await client.getTeams();
        output(success('teams', { teams }));
      } catch (err) {
        handleError('teams', err);
      }
    }
  );
}
