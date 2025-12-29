---
name: linear
description: Manage Linear issues, projects, and cycles. Maintains session memory across conversations for context continuity.
---

# Linear Skill

Manage your Linear workspace from the command line with persistent session memory.

## Starting a Session

**Always load context first** to see what you were working on:

```bash
npx linear-skill context
```

This shows:
- Recent session summaries
- Focus tickets from last session
- Recent actions taken
- Any notes you left

## Quick Start

```bash
# Setup (one time)
cp .env.example .env
cp config.example.json config.json
# Edit .env with your LINEAR_API_KEY
npm install && npm run build

# Load previous context
npx linear-skill context

# List your assigned issues
npx linear-skill issues --assignee me

# Create an issue
npx linear-skill create "Fix login bug" --team ENG

# Update an issue
npx linear-skill update ENG-123 --state "In Progress"

# Quick actions
npx linear-skill start ENG-123    # Move to "In Progress"
npx linear-skill done ENG-123     # Move to "Done"

# Mark tickets as current focus
npx linear-skill focus ENG-123 ENG-456

# Save session before ending
npx linear-skill session-save "Completed auth work, PR ready for review"
```

## Session Memory

The skill remembers your recent work across conversations:

- **Auto-tracking**: All issue interactions are logged automatically
- **Focus tickets**: Mark what you're actively working on
- **Session summaries**: 2-3 recent session summaries are kept
- **Context command**: Loads this into new conversations

## Command Categories

### Read Commands
- `teams` - List all teams
- `users` - List users (use `--me` for current user)
- `states --team ENG` - List workflow states
- `projects` - List projects
- `cycles --team ENG` - List cycles (`--active` for current)
- `issues` - List issues with filters
- `issue ENG-123` - Get issue details
- `search "query"` - Search issues

### Write Commands
- `create "title" --team ENG` - Create issue
- `update ENG-123 --state "Done"` - Update issue
- `assign ENG-123 me` - Assign issue
- `comment ENG-123 "comment text"` - Add comment
- `start ENG-123` - Move to "In Progress"
- `done ENG-123` - Move to "Done"

### Session Commands
- `context` - Load session context (use at start)
- `focus ENG-123 ENG-456` - Set focus tickets
- `notes "reminder text"` - Set session notes
- `session-save "summary"` - Save session summary
- `sessions` - View session history
- `session-clear --older-than 7` - Clear old data

### Config Commands
- `init` - Initialize configuration
- `config` - Show current config
- `cache-refresh` - Refresh teams/users/states cache
- `cache-status` - Show cache status

## Common Filters

```bash
# Issues by team
npx linear-skill issues --team ENG

# Issues by state
npx linear-skill issues --state "In Progress"

# My issues
npx linear-skill issues --assignee me

# Issues in a project
npx linear-skill issues --project <project-id>

# Issues in current cycle
npx linear-skill issues --cycle <cycle-id>

# Combine filters
npx linear-skill issues --team ENG --assignee me --state "In Progress"
```

## Setup

1. Copy `.env.example` to `.env`
2. Add your Linear API key: `LINEAR_API_KEY=lin_api_xxxx`
3. Copy `config.example.json` to `config.json`
4. Set your default team in `config.json`
5. Run `npm install && npm run build`
6. Test: `npx linear-skill teams`

## Documentation

- [REFERENCE.md](./skill/REFERENCE.md) - Full command reference
- [CONFIG.md](./skill/CONFIG.md) - Configuration guide
- [SESSION.md](./skill/SESSION.md) - Session memory details
