import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { getConfigManager } from '../config/index.js';
import { getSessionManager } from '../session/index.js';
import { output, success, error, handleError } from '../utils/response.js';

export function registerCreateCommand(cli: Argv): void {
  cli.command(
    'create <title>',
    'Create a new issue',
    (yargs) =>
      yargs
        .positional('title', {
          type: 'string',
          description: 'Issue title',
          demandOption: true,
        })
        .option('team', {
          type: 'string',
          alias: 't',
          description: 'Team key or ID (required)',
        })
        .option('description', {
          type: 'string',
          alias: 'd',
          description: 'Issue description',
        })
        .option('project', {
          type: 'string',
          alias: 'p',
          description: 'Project ID',
        })
        .option('cycle', {
          type: 'string',
          alias: 'c',
          description: 'Cycle ID',
        })
        .option('assignee', {
          type: 'string',
          alias: 'a',
          description: 'Assignee (ID, email, or "me")',
        })
        .option('state', {
          type: 'string',
          alias: 's',
          description: 'Initial state name',
        })
        .option('priority', {
          type: 'number',
          description: 'Priority (0=none, 1=urgent, 2=high, 3=normal, 4=low)',
        })
        .option('labels', {
          type: 'string',
          alias: 'l',
          description: 'Comma-separated label names or IDs',
        })
        .option('parent', {
          type: 'string',
          description: 'Parent issue ID or identifier (for sub-issues)',
        }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const config = getConfigManager();
        const session = getSessionManager();

        const teamKey = argv.team || config.getTeam();
        if (!teamKey) {
          output(
            error(
              'create',
              'MISSING_TEAM',
              'Team is required. Use --team or set default in config.json'
            )
          );
          process.exit(1);
        }

        const teamId = await client.resolveTeamId(teamKey);
        if (!teamId) {
          output(error('create', 'NOT_FOUND', `Team '${teamKey}' not found`));
          process.exit(1);
        }

        // Resolve assignee
        let assigneeId: string | undefined;
        if (argv.assignee) {
          assigneeId = (await client.resolveUserId(argv.assignee)) || undefined;
          if (!assigneeId) {
            output(
              error('create', 'NOT_FOUND', `User '${argv.assignee}' not found`)
            );
            process.exit(1);
          }
        }

        // Resolve state
        let stateId: string | undefined;
        if (argv.state) {
          stateId = (await client.resolveStateId(teamId, argv.state)) || undefined;
          if (!stateId) {
            output(
              error('create', 'NOT_FOUND', `State '${argv.state}' not found`)
            );
            process.exit(1);
          }
        }

        // Parse labels (simplified - would need proper resolution)
        const labelIds = argv.labels
          ? argv.labels.split(',').map((l) => l.trim())
          : undefined;

        // Resolve parent issue if provided
        let parentId: string | undefined;
        if (argv.parent) {
          const parentIssue = await client.getIssue(argv.parent as string);
          if (!parentIssue) {
            output(error('create', 'NOT_FOUND', `Parent issue '${argv.parent}' not found`));
            process.exit(1);
          }
          parentId = parentIssue.id;
        }

        const issue = await client.createIssue({
          title: argv.title as string,
          teamId,
          description: argv.description,
          projectId: argv.project,
          cycleId: argv.cycle,
          assigneeId,
          stateId,
          priority: argv.priority,
          labelIds,
          parentId,
        });

        // Track this interaction
        session.trackTicket({
          identifier: issue.identifier,
          title: issue.title,
          state: issue.state.name,
          priority: issue.priority,
          interactionType: 'created',
          summary: `Created new issue`,
        });

        session.logAction({
          action: 'create',
          ticket: issue.identifier,
          changes: {
            title: issue.title,
            team: teamKey,
            ...(argv.project && { project: argv.project }),
            ...(argv.assignee && { assignee: argv.assignee }),
          },
        });

        // Add to focus if this is a new task we're working on
        session.addFocusTicket(issue.identifier);

        output(success('create', { issue }));
      } catch (err) {
        handleError('create', err);
      }
    }
  );
}
