import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { getConfigManager } from '../config/index.js';
import { output, success, error, handleError } from '../utils/response.js';

export function registerCyclesCommand(cli: Argv): void {
  cli.command(
    'cycles',
    'List cycles for a team',
    (yargs) =>
      yargs
        .option('team', {
          type: 'string',
          alias: 't',
          description: 'Team key or ID',
        })
        .option('active', {
          type: 'boolean',
          alias: 'a',
          description: 'Show only active cycle',
        }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const config = getConfigManager();

        const teamKey = argv.team || config.getTeam();
        if (!teamKey) {
          output(
            error(
              'cycles',
              'MISSING_TEAM',
              'Team is required. Use --team or set default in config.json'
            )
          );
          process.exit(1);
        }

        const teamId = await client.resolveTeamId(teamKey);
        if (!teamId) {
          output(error('cycles', 'NOT_FOUND', `Team '${teamKey}' not found`));
          process.exit(1);
        }

        if (argv.active) {
          const cycle = await client.getActiveCycle(teamId);
          if (!cycle) {
            output(success('cycles', { active: null, message: 'No active cycle' }));
          } else {
            output(success('cycles', { active: cycle }));
          }
        } else {
          const cycles = await client.getCycles(teamId);
          output(success('cycles', { team: teamKey, cycles }));
        }
      } catch (err) {
        handleError('cycles', err);
      }
    }
  );
}
