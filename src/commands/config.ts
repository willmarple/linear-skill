import type { Argv } from 'yargs';
import { existsSync } from 'fs';
import { getConfigManager, PATHS } from '../config/index.js';
import { output, success, error } from '../utils/response.js';

export function registerConfigCommand(cli: Argv): void {
  cli.command(
    'config',
    'Show current configuration',
    (yargs) => yargs,
    async () => {
      const config = getConfigManager();
      const status = config.isConfigured();

      output(
        success('config', {
          configured: status.configured,
          missing: status.missing,
          team: config.getTeam(),
          preferences: config.getPreferences(),
          hasApiKey: config.hasApiKey(),
        })
      );
    }
  );

  cli.command(
    'init',
    'Initialize configuration files',
    (yargs) => yargs,
    async () => {
      const config = getConfigManager();

      const results: string[] = [];

      // Check .env
      if (!existsSync(PATHS.env)) {
        if (existsSync(PATHS.envExample)) {
          results.push(
            '.env: Copy .env.example to .env and add your LINEAR_API_KEY'
          );
        } else {
          results.push('.env: Create .env with LINEAR_API_KEY=your_key');
        }
      } else {
        if (!config.hasApiKey()) {
          results.push('.env: Add LINEAR_API_KEY to your .env file');
        } else {
          results.push('.env: OK');
        }
      }

      // Check config.json
      if (!existsSync(PATHS.config)) {
        const created = config.initConfig();
        if (created) {
          results.push('config.json: Created from config.example.json');
        } else {
          results.push('config.json: Created with defaults');
        }
      } else {
        results.push('config.json: OK');
      }

      const status = config.isConfigured();

      output(
        success('init', {
          configured: status.configured,
          results,
          nextSteps: status.missing.length > 0
            ? status.missing.map((m) => `Set up ${m}`)
            : ['Run: npx linear-skill teams (to test connection)'],
        })
      );
    }
  );

  cli.command(
    'config-set <key> <value>',
    'Set a configuration value',
    (yargs) =>
      yargs
        .positional('key', {
          type: 'string',
          description: 'Config key (e.g., team, defaultProject)',
          demandOption: true,
        })
        .positional('value', {
          type: 'string',
          description: 'Config value',
          demandOption: true,
        }),
    async (argv) => {
      const config = getConfigManager();
      const key = argv.key as string;
      const value = argv.value as string;

      const allowedKeys = ['team', 'defaultProject'];

      if (!allowedKeys.includes(key)) {
        output(
          error(
            'config-set',
            'VALIDATION_ERROR',
            `Invalid key. Allowed keys: ${allowedKeys.join(', ')}`
          )
        );
        process.exit(1);
      }

      const updates: Record<string, unknown> = {};
      updates[key] = value === 'null' ? null : value;

      config.saveConfig(updates as Partial<typeof config extends { getConfig: () => infer C } ? C : never>);

      output(
        success('config-set', {
          message: `Set ${key} = ${value}`,
          [key]: value,
        })
      );
    }
  );
}
