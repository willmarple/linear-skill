import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { getConfigManager } from '../config/index.js';
import { output, success, error, handleError } from '../utils/response.js';

export function registerProjectsCommand(cli: Argv): void {
  cli.command(
    'projects',
    'List projects',
    (yargs) =>
      yargs.option('team', {
        type: 'string',
        alias: 't',
        description: 'Filter by team key or ID',
      }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const config = getConfigManager();

        let teamId: string | undefined;
        const teamKey = argv.team || config.getTeam();

        if (teamKey) {
          teamId = (await client.resolveTeamId(teamKey)) || undefined;
          if (!teamId && argv.team) {
            output(error('projects', 'NOT_FOUND', `Team '${teamKey}' not found`));
            process.exit(1);
          }
        }

        const projects = await client.getProjects(teamId);
        output(success('projects', { projects }));
      } catch (err) {
        handleError('projects', err);
      }
    }
  );

  cli.command(
    'project <id>',
    'Get project details',
    (yargs) =>
      yargs.positional('id', {
        type: 'string',
        description: 'Project ID',
        demandOption: true,
      }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const project = await client.getProject(argv.id as string);

        if (!project) {
          output(error('project', 'NOT_FOUND', `Project '${argv.id}' not found`));
          process.exit(1);
        }

        output(success('project', { project }));
      } catch (err) {
        handleError('project', err);
      }
    }
  );

  cli.command(
    'create-project <name>',
    'Create a new project',
    (yargs) =>
      yargs
        .positional('name', {
          type: 'string',
          description: 'Project name',
          demandOption: true,
        })
        .option('team', {
          type: 'string',
          alias: 't',
          description: 'Team key or ID',
        })
        .option('description', {
          type: 'string',
          alias: 'd',
          description: 'Project description',
        })
        .option('state', {
          type: 'string',
          alias: 's',
          description: 'Project state (planned, started, paused, completed, canceled)',
          default: 'planned',
        })
        .option('start-date', {
          type: 'string',
          description: 'Start date (YYYY-MM-DD)',
        })
        .option('target-date', {
          type: 'string',
          description: 'Target date (YYYY-MM-DD)',
        }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const config = getConfigManager();

        const teamKey = argv.team || config.getTeam();
        if (!teamKey) {
          output(error('create-project', 'VALIDATION_ERROR', 'Team is required. Use --team or configure default team.'));
          process.exit(1);
        }

        const teamId = await client.resolveTeamId(teamKey);
        if (!teamId) {
          output(error('create-project', 'NOT_FOUND', `Team '${teamKey}' not found`));
          process.exit(1);
        }

        const project = await client.createProject({
          name: argv.name as string,
          teamIds: [teamId],
          description: argv.description,
          state: argv.state,
          startDate: argv['start-date'],
          targetDate: argv['target-date'],
        });

        output(success('create-project', { project }));
      } catch (err) {
        handleError('create-project', err);
      }
    }
  );
}
