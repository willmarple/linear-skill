import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { getConfigManager } from '../config/index.js';
import { output, success, error, handleError } from '../utils/response.js';

export function registerStatesCommand(cli: Argv): void {
  cli.command(
    'states',
    'List workflow states for a team',
    (yargs) =>
      yargs.option('team', {
        type: 'string',
        alias: 't',
        description: 'Team key or ID',
      }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const config = getConfigManager();

        const teamKey = argv.team || config.getTeam();
        if (!teamKey) {
          output(
            error(
              'states',
              'MISSING_TEAM',
              'Team is required. Use --team or set default in config.json'
            )
          );
          process.exit(1);
        }

        const teamId = await client.resolveTeamId(teamKey);
        if (!teamId) {
          output(error('states', 'NOT_FOUND', `Team '${teamKey}' not found`));
          process.exit(1);
        }

        const states = await client.getWorkflowStates(teamId);
        output(success('states', { team: teamKey, states }));
      } catch (err) {
        handleError('states', err);
      }
    }
  );

  cli.command(
    'create-state <name>',
    'Create a new workflow state',
    (yargs) =>
      yargs
        .positional('name', {
          type: 'string',
          description: 'State name',
          demandOption: true,
        })
        .option('team', {
          type: 'string',
          alias: 't',
          description: 'Team key or ID',
        })
        .option('type', {
          type: 'string',
          description: 'State type: backlog, unstarted, started, completed, canceled',
          default: 'unstarted',
        })
        .option('color', {
          type: 'string',
          alias: 'c',
          description: 'State color (hex without #)',
        })
        .option('position', {
          type: 'number',
          alias: 'p',
          description: 'Position in workflow (lower = earlier)',
        }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const config = getConfigManager();

        const teamKey = argv.team || config.getTeam();
        if (!teamKey) {
          output(error('create-state', 'VALIDATION_ERROR', 'Team is required. Use --team or configure default team.'));
          process.exit(1);
        }

        const teamId = await client.resolveTeamId(teamKey);
        if (!teamId) {
          output(error('create-state', 'NOT_FOUND', `Team '${teamKey}' not found`));
          process.exit(1);
        }

        const validTypes = ['backlog', 'unstarted', 'started', 'completed', 'canceled'];
        if (!validTypes.includes(argv.type as string)) {
          output(error('create-state', 'VALIDATION_ERROR', `Invalid state type. Must be one of: ${validTypes.join(', ')}`));
          process.exit(1);
        }

        const state = await client.createWorkflowState({
          name: argv.name as string,
          teamId,
          type: argv.type as 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled',
          color: argv.color,
          position: argv.position,
        });

        output(success('create-state', { state }));
      } catch (err) {
        handleError('create-state', err);
      }
    }
  );
}
