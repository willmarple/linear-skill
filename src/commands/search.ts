import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { getConfigManager } from '../config/index.js';
import { output, success, error, handleError } from '../utils/response.js';

export function registerSearchCommand(cli: Argv): void {
  cli.command(
    'search <query>',
    'Search for issues',
    (yargs) =>
      yargs
        .positional('query', {
          type: 'string',
          description: 'Search query',
          demandOption: true,
        })
        .option('team', {
          type: 'string',
          alias: 't',
          description: 'Filter by team key or ID',
        })
        .option('limit', {
          type: 'number',
          alias: 'l',
          description: 'Maximum number of results',
          default: 20,
        }),
    async (argv) => {
      try {
        const client = createLinearClient();
        const config = getConfigManager();

        const teamKey = argv.team || config.getTeam();
        let teamId: string | undefined;

        if (teamKey) {
          teamId = (await client.resolveTeamId(teamKey)) || undefined;
          if (!teamId && argv.team) {
            output(error('search', 'NOT_FOUND', `Team '${teamKey}' not found`));
            process.exit(1);
          }
        }

        const issues = await client.searchIssues(argv.query as string, {
          teamId,
          limit: argv.limit,
        });

        output(
          success('search', {
            query: argv.query,
            count: issues.length,
            issues,
          })
        );
      } catch (err) {
        handleError('search', err);
      }
    }
  );
}
