import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { getConfigManager } from '../config/index.js';
import { output, success, error, handleError } from '../utils/response.js';

// Helper to parse comma-separated values or array
function parseMultiValue(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    // Flatten in case of comma-separated values within array elements
    return value.flatMap((v) => v.split(',').map((s) => s.trim())).filter(Boolean);
  }
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

// Helper to parse priority values (1-4 or names like "urgent", "high", etc.)
function parsePriorities(value: string | string[] | number | number[] | (string | number)[] | undefined): number[] {
  if (!value) return [];

  const priorityMap: Record<string, number> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4,
    none: 0,
  };

  const values = Array.isArray(value) ? value : [value];
  const result: number[] = [];

  for (const v of values) {
    if (typeof v === 'number') {
      result.push(v);
    } else {
      // Handle comma-separated values
      const parts = String(v).split(',').map((s) => s.trim().toLowerCase());
      for (const part of parts) {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 0 && num <= 4) {
          result.push(num);
        } else if (priorityMap[part] !== undefined) {
          result.push(priorityMap[part]);
        }
      }
    }
  }

  return [...new Set(result)]; // Remove duplicates
}

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
          description: 'Filter by project ID (comma-separated for multiple)',
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
          type: 'array',
          alias: 's',
          description: 'Filter by state name(s) (can specify multiple: -s "To Do" -s "In Progress")',
        })
        .option('priority', {
          type: 'array',
          alias: 'P',
          description: 'Filter by priority (1=urgent, 2=high, 3=medium, 4=low, or names)',
        })
        .option('label', {
          type: 'array',
          alias: 'L',
          description: 'Filter by label name(s) (matches issues with ANY of the labels)',
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
          assigneeId = (await client.resolveUserId(argv.assignee as string)) || undefined;
          if (!assigneeId) {
            output(
              error('issues', 'NOT_FOUND', `User '${argv.assignee}' not found`)
            );
            process.exit(1);
          }
        }

        // Parse multi-value options
        const stateNames = parseMultiValue(argv.state as string[] | undefined);
        const priorities = parsePriorities(argv.priority as (string | number)[] | undefined);
        const labelNames = parseMultiValue(argv.label as string[] | undefined);
        const projectIds = parseMultiValue(argv.project);

        // Build filter options
        const filterOptions: Parameters<typeof client.getIssues>[0] = {
          teamId,
          cycleId: argv.cycle as string | undefined,
          assigneeId,
          limit: argv.limit,
        };

        // Add project filter (single or multiple)
        if (projectIds.length === 1) {
          filterOptions.projectId = projectIds[0];
        } else if (projectIds.length > 1) {
          filterOptions.projectIds = projectIds;
        }

        // Add state filter (by name, will be resolved by API)
        if (stateNames.length > 0) {
          filterOptions.stateNames = stateNames;
        }

        // Add priority filter
        if (priorities.length > 0) {
          filterOptions.priorities = priorities;
        }

        // Add label filter
        if (labelNames.length > 0) {
          filterOptions.labelNames = labelNames;
        }

        const issues = await client.getIssues(filterOptions);

        output(success('issues', { count: issues.length, issues }));
      } catch (err) {
        handleError('issues', err);
      }
    }
  );
}
