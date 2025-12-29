import type { Argv } from 'yargs';
import { getSessionManager } from '../session/index.js';
import { output, success } from '../utils/response.js';

export function registerSessionCommand(cli: Argv): void {
  cli.command(
    'session-save [summary]',
    'Save a session summary',
    (yargs) =>
      yargs.positional('summary', {
        type: 'string',
        description:
          'Session summary (omit to auto-generate from recent actions)',
      }),
    async (argv) => {
      const session = getSessionManager();
      const recentActions = session.getRecentActions(10);
      const focusTickets = session.getActiveContext().focusTickets;

      // Collect all tickets involved in recent actions
      const ticketsInvolved = [
        ...new Set([
          ...focusTickets,
          ...recentActions.map((a) => a.ticket),
        ]),
      ];

      let summary: string;

      if (argv.summary) {
        summary = argv.summary as string;
      } else {
        // Auto-generate summary from recent actions
        const actionSummaries = recentActions.slice(0, 5).map((a) => {
          const changes = Object.entries(a.changes)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
          return `${a.action} ${a.ticket}${changes ? ` (${changes})` : ''}`;
        });

        summary =
          actionSummaries.length > 0
            ? `Actions: ${actionSummaries.join('; ')}`
            : 'No recent actions recorded.';
      }

      session.addSessionSummary({
        summary,
        ticketsInvolved,
        actionCount: recentActions.length,
      });

      output(
        success('session-save', {
          message: 'Session saved',
          summary,
          ticketsInvolved,
          actionCount: recentActions.length,
        })
      );
    }
  );

  cli.command(
    'sessions',
    'View session history',
    (yargs) =>
      yargs.option('limit', {
        type: 'number',
        alias: 'l',
        description: 'Number of sessions to show',
        default: 3,
      }),
    async (argv) => {
      const session = getSessionManager();
      const summaries = session.getSessionSummaries().slice(0, argv.limit);

      output(
        success('sessions', {
          count: summaries.length,
          sessions: summaries,
        })
      );
    }
  );

  cli.command(
    'session-clear',
    'Clear session data',
    (yargs) =>
      yargs
        .option('older-than', {
          type: 'number',
          description: 'Clear data older than N days',
        })
        .option('all', {
          type: 'boolean',
          alias: 'a',
          description: 'Clear all session data',
        }),
    async (argv) => {
      const session = getSessionManager();

      if (argv.all) {
        session.clear();
        output(success('session-clear', { message: 'All session data cleared' }));
        return;
      }

      if (argv['older-than'] || argv.olderThan) {
        const days = (argv['older-than'] || argv.olderThan) as number;
        session.clearOlderThan(days);
        output(
          success('session-clear', {
            message: `Cleared session data older than ${days} days`,
          })
        );
        return;
      }

      output(
        success('session-clear', {
          message: 'Use --all to clear all data or --older-than N to clear old data',
        })
      );
    }
  );
}
