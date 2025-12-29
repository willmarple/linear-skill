import type { Argv } from 'yargs';
import { getSessionManager } from '../session/index.js';
import { output, success } from '../utils/response.js';

export function registerContextCommand(cli: Argv): void {
  cli.command(
    'context',
    'Load session context (use at start of conversation)',
    (yargs) =>
      yargs
        .option('detailed', {
          type: 'boolean',
          alias: 'd',
          description: 'Show detailed context including all tracked tickets',
        })
        .option('for-claude', {
          type: 'boolean',
          description: 'Output optimized for Claude parsing',
        }),
    async (argv) => {
      const session = getSessionManager();

      if (argv['for-claude'] || argv.forClaude) {
        const context = session.getContextForClaude();
        output(success('context', { sessionContext: context }));
        return;
      }

      if (argv.detailed) {
        const fullContext = session.getContext();
        output(
          success('context', {
            ...session.getContextForClaude(),
            trackedTickets: fullContext.trackedTickets,
            recentActions: fullContext.recentActions,
            sessionSummaries: fullContext.sessionSummaries,
          })
        );
        return;
      }

      // Default: optimized context for Claude
      const context = session.getContextForClaude();
      output(success('context', { sessionContext: context }));
    }
  );
}
