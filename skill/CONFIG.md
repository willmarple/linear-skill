# Configuration Guide

## Setup Overview

The Linear skill requires two configuration files:

1. **`.env`** - Contains your API key (never commit this)
2. **`config.json`** - Contains project settings

## Quick Setup

```bash
# Copy templates
cp .env.example .env
cp config.example.json config.json

# Edit .env with your API key
# LINEAR_API_KEY=lin_api_xxxx

# Edit config.json with your team
# "team": "ENG"

# Install and build
npm install
npm run build

# Test connection
npx linear-skill teams
```

## .env File

Create from `.env.example`:

```bash
# Linear API Key (required)
# Get from: Linear Settings > API > Personal API keys
LINEAR_API_KEY=lin_api_xxxxxxxxxxxx

# Optional: Override default team
# LINEAR_DEFAULT_TEAM=ENG
```

### Getting Your API Key

1. Open Linear
2. Go to Settings (gear icon)
3. Navigate to API section
4. Click "Personal API keys"
5. Create a new key with a descriptive name
6. Copy the key (starts with `lin_api_`)

## config.json

Create from `config.example.json`:

```json
{
  "version": 1,
  "team": "ENG",
  "defaultProject": null,
  "allowedTeams": ["ENG", "DESIGN"],
  "allowedProjects": [],
  "labels": {
    "bug": "label-uuid-here",
    "feature": "label-uuid-here"
  },
  "workflows": {
    "bugfix": {
      "defaultState": "Backlog",
      "defaultPriority": 2,
      "defaultLabels": ["bug"]
    }
  },
  "preferences": {
    "outputFormat": "json",
    "cacheEnabled": true,
    "cacheTtlMinutes": 60,
    "sessionMemoryEnabled": true,
    "maxTrackedTickets": 20,
    "maxRecentActions": 50,
    "maxSessionSummaries": 3
  }
}
```

### Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Config version (always 1) |
| `team` | string | Default team key (e.g., "ENG") |
| `defaultProject` | string\|null | Default project ID for new issues |
| `allowedTeams` | string[] | Restrict to specific teams |
| `allowedProjects` | string[] | Restrict to specific projects |
| `labels` | object | Label name to ID mapping |
| `workflows` | object | Workflow templates |
| `preferences` | object | Behavior preferences |

### Preferences

| Preference | Default | Description |
|------------|---------|-------------|
| `outputFormat` | "json" | Output format (json/text) |
| `cacheEnabled` | true | Enable reference data caching |
| `cacheTtlMinutes` | 60 | Cache expiration time |
| `sessionMemoryEnabled` | true | Enable session memory |
| `maxTrackedTickets` | 20 | Max tickets in session memory |
| `maxRecentActions` | 50 | Max recent actions stored |
| `maxSessionSummaries` | 3 | Max session summaries kept |

## Configuration Commands

```bash
# Show current configuration
npx linear-skill config

# Initialize config files
npx linear-skill init

# Set config values
npx linear-skill config-set team ENG
npx linear-skill config-set defaultProject abc123
```

## Cache Management

The skill caches teams, users, workflow states, and projects to minimize API calls.

```bash
# View cache status
npx linear-skill cache-status

# Force refresh
npx linear-skill cache-refresh

# Clear cache
npx linear-skill cache-clear
```

Cache is stored in `cache.json` (gitignored).

## Files Summary

| File | Gitignored | Purpose |
|------|------------|---------|
| `.env.example` | No | Template for API key |
| `.env` | Yes | Actual API key |
| `config.example.json` | No | Template for settings |
| `config.json` | Yes | Actual settings |
| `cache.json` | Yes | Cached Linear data |
| `session-memory.json` | Yes | Session context |

## Troubleshooting

### "LINEAR_API_KEY not found"

1. Check that `.env` exists in the skill directory
2. Verify the key format: `LINEAR_API_KEY=lin_api_xxxx`
3. Ensure no extra spaces or quotes

### "Team 'XXX' not found"

1. Run `npx linear-skill teams` to see available teams
2. Check spelling (case-insensitive)
3. Refresh cache: `npx linear-skill cache-refresh`

### "State 'XXX' not found"

1. Run `npx linear-skill states --team YOUR_TEAM` to see available states
2. States are team-specific
3. Common states: "Backlog", "Todo", "In Progress", "Done"

### API Rate Limits

Linear allows 5,000 requests/hour. If you hit limits:

1. Increase `cacheTtlMinutes` in config
2. Use `--limit` flags to fetch fewer items
3. Wait for rate limit reset (shown in error)
