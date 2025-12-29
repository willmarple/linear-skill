import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { getSessionManager } from '../session/index.js';
import { output, success, error, handleError } from '../utils/response.js';

export function registerIssueCommand(cli: Argv): void {
  cli.command(
    'issue <identifier>',
    'Get issue details by identifier (e.g., ENG-123) or ID',
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

        const issue = await client.getIssue(argv.identifier as string);

        if (!issue) {
          output(
            error('issue', 'NOT_FOUND', `Issue '${argv.identifier}' not found`)
          );
          process.exit(1);
        }

        // Track this interaction
        session.trackTicket({
          identifier: issue.identifier,
          title: issue.title,
          state: issue.state.name,
          priority: issue.priority,
          interactionType: 'viewed',
          summary: `Viewed issue details`,
        });

        session.logAction({
          action: 'view',
          ticket: issue.identifier,
          changes: {},
        });

        output(success('issue', { issue }));
      } catch (err) {
        handleError('issue', err);
      }
    }
  );
}
