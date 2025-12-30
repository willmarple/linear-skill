import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { getSessionManager } from '../session/index.js';
import { output, success, error, handleError } from '../utils/response.js';

export function registerCommentsCommand(cli: Argv): void {
  cli.command(
    'comments <identifier>',
    'Get comments for an issue by identifier (e.g., ENG-123)',
    (yargs) =>
      yargs.positional('identifier', {
        type: 'string',
        description: 'Issue identifier or ID',
        demandOption: true,
      }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const session = getSessionManager();

        // First verify the issue exists
        const issue = await client.getIssue(argv.identifier as string);

        if (!issue) {
          output(
            error('comments', 'NOT_FOUND', `Issue '${argv.identifier}' not found`)
          );
          process.exit(1);
        }

        const comments = await client.getComments(issue.id);

        // Track this interaction
        session.trackTicket({
          identifier: issue.identifier,
          title: issue.title,
          state: issue.state.name,
          priority: issue.priority,
          interactionType: 'viewed',
          summary: `Viewed ${comments.length} comment(s)`,
        });

        session.logAction({
          action: 'view',
          ticket: issue.identifier,
          changes: { viewedComments: true, commentCount: comments.length },
        });

        output(
          success('comments', {
            issue: {
              identifier: issue.identifier,
              title: issue.title,
            },
            count: comments.length,
            comments,
          })
        );
      } catch (err) {
        handleError('comments', err);
      }
    }
  );
}
