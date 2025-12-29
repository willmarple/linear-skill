import { config as dotenvConfig } from 'dotenv';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Config, ConfigSchema } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Skill root directory (where .env and config.json live)
export const SKILL_ROOT = join(__dirname, '..', '..');

export const PATHS = {
  env: join(SKILL_ROOT, '.env'),
  envExample: join(SKILL_ROOT, '.env.example'),
  config: join(SKILL_ROOT, 'config.json'),
  configExample: join(SKILL_ROOT, 'config.example.json'),
  cache: join(SKILL_ROOT, 'cache.json'),
  sessionMemory: join(SKILL_ROOT, 'session-memory.json'),
};

export class ConfigManager {
  private config: Config;
  private apiKey: string | null = null;

  constructor() {
    // Load .env file
    dotenvConfig({ path: PATHS.env });

    // Get API key from environment
    this.apiKey = process.env.LINEAR_API_KEY || null;

    // Load config.json
    this.config = this.loadConfig();
  }

  private loadConfig(): Config {
    if (!existsSync(PATHS.config)) {
      // Return defaults if no config file
      return ConfigSchema.parse({});
    }

    try {
      const raw = readFileSync(PATHS.config, 'utf-8');
      const parsed = JSON.parse(raw);
      return ConfigSchema.parse(parsed);
    } catch (error) {
      console.error('Warning: Failed to parse config.json, using defaults');
      return ConfigSchema.parse({});
    }
  }

  getApiKey(): string {
    if (!this.apiKey) {
      throw new Error(
        'LINEAR_API_KEY not found. Please create a .env file with your API key.\n' +
        'Copy .env.example to .env and add your key from Linear Settings > API > Personal API keys'
      );
    }
    return this.apiKey;
  }

  hasApiKey(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  getConfig(): Config {
    return this.config;
  }

  getTeam(): string | undefined {
    // Environment variable takes precedence
    return process.env.LINEAR_DEFAULT_TEAM || this.config.team;
  }

  getPreferences() {
    return this.config.preferences;
  }

  // Save updated config
  saveConfig(updates: Partial<Config>): void {
    this.config = { ...this.config, ...updates };
    writeFileSync(PATHS.config, JSON.stringify(this.config, null, 2));
  }

  // Initialize config from example if it doesn't exist
  initConfig(): boolean {
    if (existsSync(PATHS.config)) {
      return false; // Already exists
    }

    if (existsSync(PATHS.configExample)) {
      const example = readFileSync(PATHS.configExample, 'utf-8');
      writeFileSync(PATHS.config, example);
      this.config = this.loadConfig();
      return true;
    }

    // Create default config
    const defaultConfig = ConfigSchema.parse({});
    writeFileSync(PATHS.config, JSON.stringify(defaultConfig, null, 2));
    this.config = defaultConfig;
    return true;
  }

  // Check if setup is complete
  isConfigured(): { configured: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!this.hasApiKey()) {
      missing.push('.env with LINEAR_API_KEY');
    }

    if (!existsSync(PATHS.config)) {
      missing.push('config.json');
    }

    return {
      configured: missing.length === 0,
      missing,
    };
  }
}

// Singleton instance
let configManager: ConfigManager | null = null;

export function getConfigManager(): ConfigManager {
  if (!configManager) {
    configManager = new ConfigManager();
  }
  return configManager;
}

// Reset for testing
export function resetConfigManager(): void {
  configManager = null;
}
