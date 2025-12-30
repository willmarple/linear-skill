#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Commands
import { registerTeamsCommand } from './commands/teams.js';
import { registerUsersCommand } from './commands/users.js';
import { registerStatesCommand } from './commands/states.js';
import { registerProjectsCommand } from './commands/projects.js';
import { registerCyclesCommand } from './commands/cycles.js';
import { registerIssuesCommand } from './commands/issues.js';
import { registerIssueCommand } from './commands/issue.js';
import { registerSearchCommand } from './commands/search.js';
import { registerCreateCommand } from './commands/create.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerCommentsCommand } from './commands/comments.js';
import { registerContextCommand } from './commands/context.js';
import { registerFocusCommand } from './commands/focus.js';
import { registerSessionCommand } from './commands/session.js';
import { registerCacheCommand } from './commands/cache.js';
import { registerConfigCommand } from './commands/config.js';

const cli = yargs(hideBin(process.argv))
  .scriptName('linear-skill')
  .usage('$0 <command> [options]')
  .demandCommand(1, 'You must specify a command')
  .strict()
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version');

// Register all commands
registerTeamsCommand(cli);
registerUsersCommand(cli);
registerStatesCommand(cli);
registerProjectsCommand(cli);
registerCyclesCommand(cli);
registerIssuesCommand(cli);
registerIssueCommand(cli);
registerSearchCommand(cli);
registerCreateCommand(cli);
registerUpdateCommand(cli);
registerCommentsCommand(cli);
registerContextCommand(cli);
registerFocusCommand(cli);
registerSessionCommand(cli);
registerCacheCommand(cli);
registerConfigCommand(cli);

// Parse and execute
cli.parse();
