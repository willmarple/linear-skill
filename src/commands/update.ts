import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { getSessionManager } from '../session/index.js';
import { output, success, error, handleError } from '../utils/response.js';

export function registerUpdateCommand(cli: Argv): void {
  cli.command(
    'update <identifier>',
    'Update an issue',
    (yargs) =>
      yargs
        .positional('identifier', {
          type: 'string',
          description: 'Issue identifier (e.g., ENG-123)',
          demandOption: true,
        })
        .option('title', {
          type: 'string',
          description: 'New title',
        })
        .option('description', {
          type: 'string',
          alias: 'd',
          description: 'New description',
        })
        .option('project', {
          type: 'string',
          alias: 'p',
          description: 'Move to project ID (use "none" to remove)',
        })
        .option('cycle', {
          type: 'string',
          alias: 'c',
          description: 'Move to cycle ID (use "none" to remove)',
        })
        .option('assignee', {
          type: 'string',
          alias: 'a',
          description: 'Assign to user (ID, email, "me", or "none")',
        })
        .option('state', {
          type: 'string',
          alias: 's',
          description: 'Change state name',
        })
        .option('priority', {
          type: 'number',
          description: 'Priority (0=none, 1=urgent, 2=high, 3=normal, 4=low)',
        }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const session = getSessionManager();

        // First, get the issue to know its team
        const existingIssue = await client.getIssue(argv.identifier as string);
        if (!existingIssue) {
          output(
            error('update', 'NOT_FOUND', `Issue '${argv.identifier}' not found`)
          );
          process.exit(1);
        }

        const changes: Record<string, unknown> = {};
        const input: {
          title?: string;
          description?: string;
          projectId?: string | null;
          cycleId?: string | null;
          assigneeId?: string | null;
          stateId?: string;
          priority?: number;
        } = {};

        // Title
        if (argv.title) {
          input.title = argv.title;
          changes.title = argv.title;
        }

        // Description
        if (argv.description) {
          input.description = argv.description;
          changes.description = '(updated)';
        }

        // Project
        if (argv.project) {
          if (argv.project.toLowerCase() === 'none') {
            input.projectId = null;
            changes.project = 'removed';
          } else {
            input.projectId = argv.project;
            changes.project = argv.project;
          }
        }

        // Cycle
        if (argv.cycle) {
          if (argv.cycle.toLowerCase() === 'none') {
            input.cycleId = null;
            changes.cycle = 'removed';
          } else {
            input.cycleId = argv.cycle;
            changes.cycle = argv.cycle;
          }
        }

        // Assignee
        if (argv.assignee) {
          if (argv.assignee.toLowerCase() === 'none') {
            input.assigneeId = null;
            changes.assignee = 'unassigned';
          } else {
            const userId = await client.resolveUserId(argv.assignee);
            if (!userId) {
              output(
                error('update', 'NOT_FOUND', `User '${argv.assignee}' not found`)
              );
              process.exit(1);
            }
            input.assigneeId = userId;
            changes.assignee = argv.assignee;
          }
        }

        // State - need to get team ID from existing issue
        if (argv.state) {
          // Get team from the issue URL or fetch it
          await client.ensureCacheReady();
          const issue = await client.getIssue(existingIssue.id);
          if (issue) {
            // Extract team key from identifier (e.g., ENG-123 -> ENG)
            const teamKey = existingIssue.identifier.split('-')[0];
            const teamId = await client.resolveTeamId(teamKey);

            if (teamId) {
              const stateId = await client.resolveStateId(teamId, argv.state);
              if (!stateId) {
                output(
                  error('update', 'NOT_FOUND', `State '${argv.state}' not found`)
                );
                process.exit(1);
              }
              input.stateId = stateId;
              changes.state = argv.state;
            }
          }
        }

        // Priority
        if (argv.priority !== undefined) {
          input.priority = argv.priority;
          changes.priority = argv.priority;
        }

        if (Object.keys(input).length === 0) {
          output(error('update', 'VALIDATION_ERROR', 'No changes specified'));
          process.exit(1);
        }

        const issue = await client.updateIssue(existingIssue.id, input);

        // Track this interaction
        session.trackTicket({
          identifier: issue.identifier,
          title: issue.title,
          state: issue.state.name,
          priority: issue.priority,
          interactionType: 'updated',
          summary: `Updated: ${Object.keys(changes).join(', ')}`,
        });

        session.logAction({
          action: 'update',
          ticket: issue.identifier,
          changes,
        });

        output(success('update', { issue, changes }));
      } catch (err) {
        handleError('update', err);
      }
    }
  );

  // Quick action: start (move to In Progress)
  cli.command(
    'start <identifier>',
    'Move issue to "In Progress" state',
    (yargs) =>
      yargs.positional('identifier', {
        type: 'string',
        description: 'Issue identifier',
        demandOption: true,
      }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const session = getSessionManager();

        const existingIssue = await client.getIssue(argv.identifier as string);
        if (!existingIssue) {
          output(
            error('start', 'NOT_FOUND', `Issue '${argv.identifier}' not found`)
          );
          process.exit(1);
        }

        const teamKey = existingIssue.identifier.split('-')[0];
        const teamId = await client.resolveTeamId(teamKey);

        if (!teamId) {
          output(error('start', 'NOT_FOUND', `Team not found`));
          process.exit(1);
        }

        const stateId = await client.resolveStateId(teamId, 'In Progress');
        if (!stateId) {
          output(
            error('start', 'NOT_FOUND', `State 'In Progress' not found in team`)
          );
          process.exit(1);
        }

        const issue = await client.updateIssue(existingIssue.id, { stateId });

        session.trackTicket({
          identifier: issue.identifier,
          title: issue.title,
          state: issue.state.name,
          priority: issue.priority,
          interactionType: 'updated',
          summary: 'Started (In Progress)',
        });

        session.logAction({
          action: 'update',
          ticket: issue.identifier,
          changes: { state: 'In Progress' },
        });

        session.addFocusTicket(issue.identifier);

        output(success('start', { issue }));
      } catch (err) {
        handleError('start', err);
      }
    }
  );

  // Quick action: done (move to Done)
  cli.command(
    'done <identifier>',
    'Move issue to "Done" state',
    (yargs) =>
      yargs.positional('identifier', {
        type: 'string',
        description: 'Issue identifier',
        demandOption: true,
      }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const session = getSessionManager();

        const existingIssue = await client.getIssue(argv.identifier as string);
        if (!existingIssue) {
          output(
            error('done', 'NOT_FOUND', `Issue '${argv.identifier}' not found`)
          );
          process.exit(1);
        }

        const teamKey = existingIssue.identifier.split('-')[0];
        const teamId = await client.resolveTeamId(teamKey);

        if (!teamId) {
          output(error('done', 'NOT_FOUND', `Team not found`));
          process.exit(1);
        }

        const stateId = await client.resolveStateId(teamId, 'Done');
        if (!stateId) {
          output(error('done', 'NOT_FOUND', `State 'Done' not found in team`));
          process.exit(1);
        }

        const issue = await client.updateIssue(existingIssue.id, { stateId });

        session.trackTicket({
          identifier: issue.identifier,
          title: issue.title,
          state: issue.state.name,
          priority: issue.priority,
          interactionType: 'updated',
          summary: 'Completed (Done)',
        });

        session.logAction({
          action: 'update',
          ticket: issue.identifier,
          changes: { state: 'Done' },
        });

        // Remove from focus since it's done
        session.removeFocusTicket(issue.identifier);

        output(success('done', { issue }));
      } catch (err) {
        handleError('done', err);
      }
    }
  );

  // Assign command
  cli.command(
    'assign <identifier> <user>',
    'Assign issue to a user',
    (yargs) =>
      yargs
        .positional('identifier', {
          type: 'string',
          description: 'Issue identifier',
          demandOption: true,
        })
        .positional('user', {
          type: 'string',
          description: 'User (ID, email, "me", or "none")',
          demandOption: true,
        }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const session = getSessionManager();

        const existingIssue = await client.getIssue(argv.identifier as string);
        if (!existingIssue) {
          output(
            error('assign', 'NOT_FOUND', `Issue '${argv.identifier}' not found`)
          );
          process.exit(1);
        }

        let assigneeId: string | null = null;
        const user = argv.user as string;

        if (user.toLowerCase() !== 'none') {
          const resolved = await client.resolveUserId(user);
          if (!resolved) {
            output(error('assign', 'NOT_FOUND', `User '${user}' not found`));
            process.exit(1);
          }
          assigneeId = resolved;
        }

        const issue = await client.updateIssue(existingIssue.id, { assigneeId });

        session.trackTicket({
          identifier: issue.identifier,
          title: issue.title,
          state: issue.state.name,
          priority: issue.priority,
          interactionType: 'assigned',
          summary: assigneeId ? `Assigned to ${user}` : 'Unassigned',
        });

        session.logAction({
          action: 'assign',
          ticket: issue.identifier,
          changes: { assignee: user },
        });

        output(success('assign', { issue }));
      } catch (err) {
        handleError('assign', err);
      }
    }
  );

  // Comment command
  cli.command(
    'comment <identifier> <body>',
    'Add a comment to an issue',
    (yargs) =>
      yargs
        .positional('identifier', {
          type: 'string',
          description: 'Issue identifier',
          demandOption: true,
        })
        .positional('body', {
          type: 'string',
          description: 'Comment body',
          demandOption: true,
        }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const session = getSessionManager();

        const existingIssue = await client.getIssue(argv.identifier as string);
        if (!existingIssue) {
          output(
            error('comment', 'NOT_FOUND', `Issue '${argv.identifier}' not found`)
          );
          process.exit(1);
        }

        const comment = await client.addComment(
          existingIssue.id,
          argv.body as string
        );

        session.trackTicket({
          identifier: existingIssue.identifier,
          title: existingIssue.title,
          state: existingIssue.state.name,
          priority: existingIssue.priority,
          interactionType: 'commented',
          summary: `Added comment`,
        });

        session.logAction({
          action: 'comment',
          ticket: existingIssue.identifier,
          changes: { comment: '(added)' },
        });

        output(
          success('comment', {
            issue: { identifier: existingIssue.identifier },
            comment,
          })
        );
      } catch (err) {
        handleError('comment', err);
      }
    }
  );
}
