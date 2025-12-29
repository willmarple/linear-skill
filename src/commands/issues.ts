import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { getConfigManager } from '../config/index.js';
import { output, success, error, handleError } from '../utils/response.js';

export function registerIssuesCommand(cli: Argv): void {
  cli.command(
    'issues',
    'List issues with filters',
    (yargs) =>
      yargs
        .option('team', {
          type: 'string',
          alias: 't',
          description: 'Filter by team key or ID',
        })
        .option('project', {
          type: 'string',
          alias: 'p',
          description: 'Filter by project ID',
        })
        .option('cycle', {
          type: 'string',
          alias: 'c',
          description: 'Filter by cycle ID',
        })
        .option('assignee', {
          type: 'string',
          alias: 'a',
          description: 'Filter by assignee (ID, email, or "me")',
        })
        .option('state', {
          type: 'string',
          alias: 's',
          description: 'Filter by state name',
        })
        .option('limit', {
          type: 'number',
          alias: 'l',
          description: 'Maximum number of issues to return',
          default: 50,
        }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const config = getConfigManager();

        const teamKey = argv.team || config.getTeam();
        let teamId: string | undefined;
        let stateId: string | undefined;
        let assigneeId: string | undefined;

        // Resolve team
        if (teamKey) {
          teamId = (await client.resolveTeamId(teamKey)) || undefined;
          if (!teamId && argv.team) {
            output(error('issues', 'NOT_FOUND', `Team '${teamKey}' not found`));
            process.exit(1);
          }
        }

        // Resolve assignee
        if (argv.assignee) {
          assigneeId = (await client.resolveUserId(argv.assignee)) || undefined;
          if (!assigneeId) {
            output(
              error('issues', 'NOT_FOUND', `User '${argv.assignee}' not found`)
            );
            process.exit(1);
          }
        }

        // Resolve state (requires team)
        if (argv.state && teamId) {
          stateId = (await client.resolveStateId(teamId, argv.state)) || undefined;
          if (!stateId) {
            output(
              error('issues', 'NOT_FOUND', `State '${argv.state}' not found in team`)
            );
            process.exit(1);
          }
        }

        const issues = await client.getIssues({
          teamId,
          projectId: argv.project,
          cycleId: argv.cycle,
          assigneeId,
          stateId,
          limit: argv.limit,
        });

        output(success('issues', { count: issues.length, issues }));
      } catch (err) {
        handleError('issues', err);
      }
    }
  );
}
