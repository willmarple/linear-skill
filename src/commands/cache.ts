import type { Argv } from 'yargs';
import { createLinearClient } from '../client/index.js';
import { getCacheManager } from '../cache/index.js';
import { output, success, handleError } from '../utils/response.js';

export function registerCacheCommand(cli: Argv): void {
  cli.command(
    'cache-refresh',
    'Refresh the cache (teams, users, states, projects)',
    (yargs) => yargs,
    async () => {
      try {
        const client = createLinearClient();
        await client.refreshCache();

        const cache = getCacheManager();
        const status = cache.getStatus();

        output(
          success('cache-refresh', {
            message: 'Cache refreshed',
            ...status,
          })
        );
      } catch (err) {
        handleError('cache-refresh', err);
      }
    }
  );

  cli.command(
    'cache-status',
    'Show cache status',
    (yargs) => yargs,
    async () => {
      const cache = getCacheManager();
      const status = cache.getStatus();

      output(success('cache-status', status));
    }
  );

  cli.command(
    'cache-clear',
    'Clear the cache',
    (yargs) => yargs,
    async () => {
      const cache = getCacheManager();
      cache.clear();

      output(success('cache-clear', { message: 'Cache cleared' }));
    }
  );
}
