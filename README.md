# Linear Skill for Claude

A CLI tool that enables Claude to manage Linear issues, projects, and cycles with persistent session memory.

## Overview

This skill provides Claude with the ability to:
- Create, update, and search Linear issues
- Track work across conversations with session memory
- Follow project-specific workflows and conventions
- Read and respond to comments/feedback

## Quick Start

### 1. Get Your Linear API Key

1. Go to [Linear Settings](https://linear.app/settings/api)
2. Click "Create new API key"
3. Give it a name (e.g., "Claude Skill")
4. Copy the key (starts with `lin_api_`)

### 2. Set Up Environment

```bash
cd .claude/skills/linear-skill

# Create .env file
cp .env.example .env

# Edit .env and add your API key
# LINEAR_API_KEY=lin_api_your_key_here
```

### 3. Install and Build

```bash
npm install
npm run build
```

### 4. Initialize Configuration

You have two options:

**Option A: Let Claude help you (Recommended)**

Tell Claude: "Initialize the Linear skill for this project"

Claude will:
- Discover your teams and projects
- Ask you questions about your workflow
- Populate `config.json` with the correct values

**Option B: Manual setup**

```bash
# Copy example config
cp config.example.json config.json

# Discover your team key
npx linear-skill teams

# Discover your projects
npx linear-skill projects

# Edit config.json with your values
```

### 5. Set Up Linear Workflow States (Manual)

The skill expects these workflow states in your Linear team. Some exist by default; others need to be created.

**Go to:** Linear → Settings → Teams → [Your Team] → Workflow

**Default states (already exist):**
- Triage
- Backlog
- Todo
- In Progress
- Done
- Canceled

**States to create:**

| State | Type | Purpose |
|-------|------|---------|
| **Client Review** | Backlog | Client inbox for reviewing developer-created tickets |
| **Dev Done** | Completed | Code complete, not yet deployed to staging |
| **Ready to Test** | Completed | Deployed to staging, awaiting client testing |

**Recommended order in Linear:**
1. Client Review
2. Triage
3. Backlog
4. Todo
5. In Progress
6. Dev Done
7. Ready to Test
8. Done
9. Canceled

### 6. Verify Setup

```bash
# Test connection
npx linear-skill teams

# Verify workflow states
npx linear-skill states --team YOUR_TEAM_KEY

# Check configuration
npx linear-skill config
```

## Configuration Reference

### .env

```bash
# Required: Your Linear API key
LINEAR_API_KEY=lin_api_xxxxxxxxxxxx
```

### config.json

```json
{
  "version": 1,
  "team": "TEAM_KEY",           // Your team's key (e.g., "ENG", "WIL")
  "defaultProject": "uuid",      // Default project ID for new issues
  "allowedTeams": ["TEAM_KEY"],  // Teams Claude can access
  "allowedProjects": [],         // Empty = all projects allowed

  "projects": {                  // Named shortcuts for projects
    "support": {
      "id": "project-uuid",
      "name": "Support & Maintenance",
      "description": "Bug fixes and production support"
    },
    "feature": {
      "id": "project-uuid",
      "name": "Feature Development",
      "description": "New feature work"
    }
  },

  "priorityContext": {           // What priorities mean for YOUR project
    "high": "Required for current release",
    "medium": "Standard sprint work",
    "currentPhase": "Description of current project phase"
  },

  "labels": {                    // Label name → ID mappings
    "bug": "label-uuid",
    "feature": "label-uuid",
    "improvement": "label-uuid"
  },

  "workflows": {                 // Default values by issue type
    "bugfix": {
      "defaultState": "Client Review",
      "defaultPriority": 2,
      "defaultLabels": ["bug"]
    },
    "feature": {
      "defaultState": "Client Review",
      "defaultPriority": 3,
      "defaultLabels": ["feature"]
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

## Claude Agent Initialization

When Claude encounters this skill for the first time in a project, it can help bootstrap the configuration.

### Initialization Prompt

Tell Claude:

> "Initialize the Linear skill. Help me set up the config.json with my team's information."

### What Claude Will Do

1. **Verify API key** - Check `.env` has a valid `LINEAR_API_KEY`

2. **Discover workspace** - Run these commands:
   ```bash
   npx linear-skill teams      # Find team key
   npx linear-skill projects   # Find project IDs
   npx linear-skill states --team TEAM  # Verify workflow states
   ```

3. **Ask questions:**
   - Which team should be the default?
   - What projects exist and how should they be categorized?
   - What does "High priority" mean for your current phase?
   - What labels do you use?

4. **Generate config.json** with discovered values

5. **Verify workflow states** and prompt to create missing ones

### Post-Initialization

After setup, Claude will:
- Read `config.json` at the start of each session
- Use project-specific values instead of generic placeholders
- Apply the correct priority context for your current phase

## File Structure

```
linear-skill/
├── .env                    # API key (git-ignored)
├── .env.example            # Template for .env
├── config.json             # Project-specific configuration
├── config.example.json     # Template for config.json
├── cache.json              # Cached teams/users/states (auto-generated)
├── session-memory.json     # Session tracking (auto-generated)
├── SKILL.md                # Main skill documentation for Claude
├── README.md               # This file (developer documentation)
├── package.json
├── tsconfig.json
├── src/                    # TypeScript source
│   ├── cli.ts              # CLI entry point
│   ├── client/             # Linear API client
│   ├── commands/           # CLI commands
│   ├── config/             # Configuration management
│   ├── cache/              # Caching logic
│   ├── session/            # Session memory
│   ├── types/              # TypeScript types
│   └── utils/              # Utilities
├── dist/                   # Compiled JavaScript (auto-generated)
└── skill/                  # Additional documentation
    ├── REFERENCE.md        # Full command reference
    ├── CONFIG.md           # Configuration details
    └── SESSION.md          # Session memory details
```

## Common Commands

```bash
# Session management
npx linear-skill context              # Load previous session context
npx linear-skill session-save "msg"   # Save session summary

# Reading
npx linear-skill issues --assignee me
npx linear-skill issue TEAM-123
npx linear-skill issue TEAM-123 --comments
npx linear-skill comments TEAM-123

# Writing
npx linear-skill create "Title" --team TEAM --state "Client Review"
npx linear-skill update TEAM-123 --state "In Progress"
npx linear-skill comment TEAM-123 "Comment text"

# Quick actions
npx linear-skill start TEAM-123       # → In Progress
npx linear-skill done TEAM-123        # → Done

# Maintenance
npx linear-skill cache-refresh        # Refresh cached data
npx linear-skill cache-status         # Check cache age
```

## Troubleshooting

### "Team not found"

```bash
# Check available teams
npx linear-skill teams

# Update config.json with correct team key
```

### "State not found"

```bash
# List states for your team
npx linear-skill states --team YOUR_TEAM

# Ensure the state name matches exactly (case-sensitive)
```

### API Key Issues

```bash
# Verify .env exists and has the key
cat .env

# Test the connection
npx linear-skill teams
```

### Cache Issues

```bash
# Force refresh
npx linear-skill cache-refresh

# Or clear completely
npx linear-skill cache-clear
```

## Documentation

- [SKILL.md](./SKILL.md) - Skill documentation for Claude (conventions, workflows)
- [skill/REFERENCE.md](./skill/REFERENCE.md) - Full command reference
- [skill/CONFIG.md](./skill/CONFIG.md) - Configuration guide
- [skill/SESSION.md](./skill/SESSION.md) - Session memory details

## License

MIT
