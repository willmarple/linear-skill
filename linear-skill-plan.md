# Linear Skill Implementation Plan

## Overview

Create a CLI-based skill for managing Linear issues, projects, and cycles without requiring the MCP server. This follows the same pattern as the Playwright skill but is **simpler** because Linear's API is stateless (no daemon needed).

**Key Design Goals:**
1. **Project-agnostic**: Can be installed in any project via git submodule or npm
2. **Session Memory**: Maintains context across Claude conversations
3. **Minimal Context**: Only loads what's needed, unlike MCP's full tool catalog

## Key Differences from Playwright Skill

| Aspect | Playwright Skill | Linear Skill |
|--------|------------------|--------------|
| Architecture | Daemon-based (browser state) | Stateless CLI (no daemon) |
| Communication | Unix socket | Direct API calls |
| State | Persistent browser sessions | Cached reference data only |
| Complexity | Higher (browser lifecycle) | Lower (REST-like GraphQL) |

## Architecture

```
┌─────────────────────────────────────────┐
│           CLI Commands                   │
│  npx linear-skill <command>              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           @linear/sdk                    │
│  - TypeScript SDK wrapper                │
│  - GraphQL under the hood                │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│       https://api.linear.app/graphql     │
│  - 5,000 requests/hour                   │
│  - 3M complexity points/hour             │
└─────────────────────────────────────────┘
```

## Directory Structure

```
.claude/skills/linear-skill/          # Self-contained Git repository
│
├── .env                              # API key (gitignored)
├── .env.example                      # Template for setup
├── .gitignore                        # Ignores secrets and runtime files
├── config.json                       # Project config (gitignored)
├── config.example.json               # Template for setup
├── cache.json                        # Cached teams/users/states (gitignored)
├── session-memory.json               # Session context (gitignored)
│
├── SKILL.md                          # Main skill documentation (Claude reads this)
├── skill/
│   ├── REFERENCE.md                  # Full command reference
│   ├── CONFIG.md                     # Configuration guide
│   ├── WORKFLOWS.md                  # Common workflow patterns
│   └── SESSION.md                    # Session memory guide
│
├── src/
│   ├── cli.ts                        # CLI entry point (yargs)
│   ├── commands/
│   │   ├── config.ts                 # Config management
│   │   ├── context.ts                # Session context commands
│   │   ├── teams.ts                  # Team operations
│   │   ├── projects.ts               # Project operations
│   │   ├── cycles.ts                 # Cycle operations
│   │   ├── issues.ts                 # Issue CRUD
│   │   ├── search.ts                 # Issue search
│   │   ├── session.ts                # Session memory commands
│   │   └── users.ts                  # User operations
│   ├── cache/
│   │   ├── CacheStore.ts             # Reference data cache
│   │   └── index.ts
│   ├── session/
│   │   ├── SessionMemory.ts          # Session memory manager
│   │   ├── Tracker.ts                # Auto-tracking for mutations
│   │   └── index.ts
│   ├── config/
│   │   ├── ConfigManager.ts          # Config + env loading
│   │   └── index.ts
│   ├── client/
│   │   ├── LinearClient.ts           # SDK wrapper
│   │   └── index.ts
│   └── types/
│       └── index.ts                  # TypeScript types
│
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Files Tracked vs Ignored

| File | Tracked in Git | Purpose |
|------|----------------|---------|
| `.env.example` | Yes | Template showing required env vars |
| `.env` | No | Actual API key |
| `config.example.json` | Yes | Template showing config structure |
| `config.json` | No | Actual project configuration |
| `cache.json` | No | Runtime cache (teams, users, states) |
| `session-memory.json` | No | Session context between conversations |
| `src/**`, `SKILL.md`, etc. | Yes | Skill code and documentation |

## Command Reference

### Configuration
```bash
# Initial setup - interactive
npx linear-skill init

# Set API key
npx linear-skill config set-key <api-key>

# Set default team
npx linear-skill config set-team <team-key>

# Set default project
npx linear-skill config set-project <project-id>

# View current config
npx linear-skill config show
```

### Teams & Users
```bash
# List all teams
npx linear-skill teams

# List team members
npx linear-skill users --team <team-key>

# List workflow states for a team
npx linear-skill states --team <team-key>
```

### Projects
```bash
# List all projects
npx linear-skill projects

# List projects for a team
npx linear-skill projects --team <team-key>

# Get project details
npx linear-skill project <project-id>

# Create project
npx linear-skill project-create "<name>" --team <team-key>
```

### Cycles
```bash
# List cycles
npx linear-skill cycles --team <team-key>

# Get active cycle
npx linear-skill cycles --active

# Get cycle details
npx linear-skill cycle <cycle-id>
```

### Issues
```bash
# List issues (with filters)
npx linear-skill issues
npx linear-skill issues --project <project-id>
npx linear-skill issues --cycle <cycle-id>
npx linear-skill issues --assignee me
npx linear-skill issues --state "In Progress"
npx linear-skill issues --limit 50

# Get issue details
npx linear-skill issue <identifier>     # e.g., "ENG-123"
npx linear-skill issue <id>             # UUID

# Create issue
npx linear-skill create "<title>" --team <team-key>
npx linear-skill create "<title>" --team ENG --project <id> --assignee <user>
npx linear-skill create "<title>" --team ENG --priority 1 --label "bug"

# Update issue
npx linear-skill update <identifier> --title "New title"
npx linear-skill update <identifier> --state "Done"
npx linear-skill update <identifier> --assignee <user-id>
npx linear-skill update <identifier> --priority 2
npx linear-skill update <identifier> --project <project-id>
npx linear-skill update <identifier> --cycle <cycle-id>

# Batch operations
npx linear-skill batch-update --ids "ENG-1,ENG-2,ENG-3" --state "In Progress"
npx linear-skill batch-move --ids "ENG-1,ENG-2" --cycle <cycle-id>

# Search
npx linear-skill search "authentication bug"
npx linear-skill search "login" --team ENG --limit 20
```

### Quick Actions (Shortcuts)
```bash
# Assign issue to me
npx linear-skill assign <identifier> me

# Move to "In Progress"
npx linear-skill start <identifier>

# Move to "Done"
npx linear-skill done <identifier>

# Add comment
npx linear-skill comment <identifier> "This is my comment"
```

## Response Format

All commands return JSON for easy parsing:

```json
{
  "success": true,
  "command": "create",
  "data": {
    "id": "abc123",
    "identifier": "ENG-456",
    "title": "Fix authentication bug",
    "state": { "id": "xyz", "name": "Backlog" },
    "assignee": { "id": "user1", "name": "John Doe" },
    "project": { "id": "proj1", "name": "Q1 Goals" },
    "url": "https://linear.app/myteam/issue/ENG-456"
  }
}
```

Error responses:
```json
{
  "success": false,
  "command": "create",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Team key 'INVALID' not found"
  }
}
```

## Caching Strategy

### What to Cache
- Teams (rarely change)
- Workflow states per team
- Users
- Projects
- Labels

### Cache Location
```
.claude/linear-cache.json
```

### Cache Structure
```json
{
  "version": 1,
  "lastRefresh": "2025-12-28T10:00:00Z",
  "ttlMinutes": 60,
  "data": {
    "teams": [...],
    "states": { "team-id": [...] },
    "users": [...],
    "projects": [...],
    "labels": [...]
  }
}
```

### Cache Commands
```bash
# Force refresh cache
npx linear-skill cache-refresh

# Clear cache
npx linear-skill cache-clear

# View cache status
npx linear-skill cache-status
```

---

## Session Memory (Context Persistence)

The session memory feature solves the "new conversation amnesia" problem. When you start a new Claude conversation, the skill can load recent context about what tickets you were working on.

### The Problem

```
Conversation 1: "Update ENG-123, ENG-456, ENG-789 to In Progress"
[Claude does the work, conversation ends]

Conversation 2: "What was I working on?"
[Claude has no idea - context is lost]
```

### The Solution

The skill maintains a **rolling session memory** with:
- Last 2-3 work session summaries
- Currently active/focus tickets
- Recent changes made via the skill
- Working context (branch, files, notes)

### Session Memory Location

```
# Global (shared across projects)
~/.config/linear-skill/session-memory.json

# Project-specific (optional override)
.claude/linear-session.json
```

### Session Memory Schema

```json
{
  "version": 1,
  "updatedAt": "2025-12-28T21:34:10Z",

  "activeContext": {
    "focusTickets": ["ENG-123", "ENG-456"],
    "activeBranch": "feature/auth-refactor",
    "activeProject": "Q1 Auth Improvements",
    "notes": "Working on SSO integration, blocked on API keys"
  },

  "trackedTickets": [
    {
      "identifier": "ENG-123",
      "title": "Implement SSO login",
      "state": "In Progress",
      "priority": 1,
      "lastInteraction": "2025-12-28T20:00:00Z",
      "interactionType": "updated",
      "summary": "Moved to In Progress, assigned to me"
    },
    {
      "identifier": "ENG-456",
      "title": "Fix token refresh bug",
      "state": "In Review",
      "priority": 2,
      "lastInteraction": "2025-12-28T19:30:00Z",
      "interactionType": "commented",
      "summary": "Added comment about test coverage"
    }
  ],

  "recentActions": [
    {
      "timestamp": "2025-12-28T21:30:00Z",
      "action": "update",
      "ticket": "ENG-123",
      "changes": { "state": "In Progress", "assignee": "me" }
    },
    {
      "timestamp": "2025-12-28T21:25:00Z",
      "action": "create",
      "ticket": "ENG-789",
      "changes": { "title": "Add logout endpoint", "project": "Q1 Auth" }
    }
  ],

  "sessionSummaries": [
    {
      "id": "session-2025-12-28-evening",
      "timestamp": "2025-12-28T21:30:00Z",
      "summary": "Worked on auth refactor: moved ENG-123 to In Progress, created ENG-789 for logout endpoint, commented on ENG-456 about test coverage. Next: waiting for API keys from DevOps.",
      "ticketsInvolved": ["ENG-123", "ENG-456", "ENG-789"],
      "actionCount": 5
    },
    {
      "id": "session-2025-12-27-afternoon",
      "timestamp": "2025-12-27T16:00:00Z",
      "summary": "Sprint planning: triaged 8 bugs, moved 3 to current cycle, assigned priorities. Focus for next session: ENG-123 SSO implementation.",
      "ticketsInvolved": ["ENG-100", "ENG-101", "ENG-123"],
      "actionCount": 12
    }
  ],

  "config": {
    "maxTrackedTickets": 20,
    "maxRecentActions": 50,
    "maxSessionSummaries": 3,
    "autoSummarizeAfterActions": 10
  }
}
```

### Session Memory Commands

```bash
# Load context into current conversation (outputs summary for Claude)
npx linear-skill context
# Output: "Last session (2h ago): Worked on auth refactor..."

# Get detailed context
npx linear-skill context --detailed

# Mark tickets as "focus" for current work
npx linear-skill focus ENG-123 ENG-456

# Clear focus
npx linear-skill focus --clear

# Save session summary (auto-generates or provide custom)
npx linear-skill session-save
npx linear-skill session-save "Completed auth refactor, ready for review"

# View session history
npx linear-skill sessions

# Clear old session data
npx linear-skill session-clear --older-than 7d
```

### Auto-Tracking Behavior

The skill automatically tracks context when you use it:

1. **On any issue interaction**: Adds ticket to `trackedTickets`
2. **On mutations (create/update)**: Logs to `recentActions`
3. **Every N actions** (configurable): Auto-generates session summary
4. **On explicit save**: Creates detailed summary with AI assistance

### Context Loading for New Conversations

When Claude invokes the skill, it can request context:

```bash
# At start of Linear-related conversation
npx linear-skill context --for-claude
```

Output (designed for Claude to parse):
```json
{
  "sessionContext": {
    "lastActive": "2 hours ago",
    "summary": "Working on auth refactor. Focus tickets: ENG-123 (SSO login, In Progress), ENG-456 (token bug, In Review). Created ENG-789 for logout. Blocked on API keys from DevOps.",
    "focusTickets": [
      { "id": "ENG-123", "title": "Implement SSO login", "state": "In Progress" },
      { "id": "ENG-456", "title": "Fix token refresh bug", "state": "In Review" }
    ],
    "recentActions": [
      "Updated ENG-123: state → In Progress",
      "Created ENG-789: Add logout endpoint",
      "Commented on ENG-456"
    ],
    "notes": "Blocked on API keys from DevOps"
  }
}
```

### Skill Integration with Context

The SKILL.md instructs Claude to load context first:

```markdown
## Starting a Linear Session

Before managing tickets, load your previous context:

\`\`\`bash
npx linear-skill context
\`\`\`

This shows what you were working on in previous sessions.
```

---

## Project-Local Configuration

Everything is self-contained within the skill directory. The skill is tracked as its own Git repository.

### Skill Directory Structure

```
.claude/skills/linear-skill/
├── .env                     # Actual secrets (gitignored)
├── .env.example             # Template for setup
├── .gitignore               # Ignores .env, config.json, session/cache
├── config.json              # Actual config (gitignored)
├── config.example.json      # Template for setup
├── cache.json               # Cached teams/users/states (gitignored)
├── session-memory.json      # Session context (gitignored)
├── SKILL.md                 # Main skill documentation
├── skill/
│   ├── REFERENCE.md
│   ├── CONFIG.md
│   ├── WORKFLOWS.md
│   └── SESSION.md
├── src/
│   └── ...
├── package.json
└── tsconfig.json
```

### .env File

Location: `.claude/skills/linear-skill/.env`

```bash
# Linear API Key (required)
# Get from: Linear Settings > API > Personal API keys
LINEAR_API_KEY=lin_api_xxxxxxxxxxxx

# Optional: Override default team
# LINEAR_DEFAULT_TEAM=ENG
```

### .env.example

```bash
# Linear API Key (required)
# Get from: Linear Settings > API > Personal API keys
LINEAR_API_KEY=lin_api_your_key_here

# Optional: Override default team
# LINEAR_DEFAULT_TEAM=ENG
```

### config.json

Location: `.claude/skills/linear-skill/config.json`

```json
{
  "version": 1,
  "team": "ENG",
  "defaultProject": null,

  "allowedTeams": ["ENG", "DESIGN"],
  "allowedProjects": [],

  "labels": {
    "bug": "label-uuid-1",
    "feature": "label-uuid-2"
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
    "maxSessionSummaries": 3
  }
}
```

### config.example.json

```json
{
  "version": 1,
  "team": "YOUR_TEAM_KEY",
  "defaultProject": null,

  "allowedTeams": [],
  "allowedProjects": [],

  "labels": {},

  "workflows": {},

  "preferences": {
    "outputFormat": "json",
    "cacheEnabled": true,
    "cacheTtlMinutes": 60,
    "sessionMemoryEnabled": true,
    "maxSessionSummaries": 3
  }
}
```

### .gitignore (within skill directory)

```gitignore
# Environment and secrets
.env

# Runtime configuration (may contain project-specific IDs)
config.json

# Cache and session data
cache.json
session-memory.json

# Node
node_modules/
dist/

# OS
.DS_Store
```

### Configuration Precedence

```
CLI flags > .env > config.json > Defaults
```

Example:
```bash
# Uses config.json team, but overrides with flag
npx linear-skill issues --team DESIGN

# Uses LINEAR_API_KEY from .env + config.json team
npx linear-skill issues --state "In Progress"
```

### First-Time Setup Flow

```bash
# 1. Clone/add the skill to your project
git clone https://github.com/your-org/linear-skill .claude/skills/linear-skill

# 2. Copy example files
cd .claude/skills/linear-skill
cp .env.example .env
cp config.example.json config.json

# 3. Edit .env with your API key
# LINEAR_API_KEY=lin_api_xxxx

# 4. Edit config.json with your team/project settings

# 5. Install dependencies
npm install

# 6. Test connection
npx linear-skill teams
```

Or use interactive setup:
```bash
npx linear-skill init

# Prompts:
# > Linear API Key: lin_api_xxxx
# > Default team: ENG
# > Enable session memory? (Y/n): Y
#
# Created: .env
# Created: config.json
```

### Adding to a New Project

Since the skill is its own Git repo, add it as a submodule:

```bash
cd your-project
git submodule add https://github.com/your-org/linear-skill .claude/skills/linear-skill
cd .claude/skills/linear-skill
cp .env.example .env
cp config.example.json config.json
# Edit .env and config.json for this project
```

Each project gets its own `.env` and `config.json` with project-specific settings.

---

## Authentication

### API Key Setup
1. Go to Linear Settings > API > Personal API keys
2. Create a new key with appropriate scopes
3. Add to `.claude/skills/linear-skill/.env`:
   ```
   LINEAR_API_KEY=lin_api_xxxx
   ```

### Security
- API key stored in `.env` which is gitignored
- `config.json` is also gitignored (may contain project-specific IDs)
- Example files show structure without secrets
- Session memory contains ticket IDs/titles only (no sensitive content)

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Project setup (TypeScript, yargs, @linear/sdk)
- [ ] Two-tier configuration system (global + project)
- [ ] Cache system for teams/users/states
- [ ] LinearClient wrapper with multi-workspace support
- [ ] Basic error handling and JSON output

### Phase 2: Read Operations
- [ ] `teams` - List teams
- [ ] `users` - List users
- [ ] `states` - List workflow states
- [ ] `projects` - List/get projects
- [ ] `cycles` - List/get cycles
- [ ] `issues` - List issues with filters
- [ ] `issue` - Get single issue
- [ ] `search` - Search issues

### Phase 3: Write Operations
- [ ] `create` - Create issue (with auto-tracking)
- [ ] `update` - Update issue (with auto-tracking)
- [ ] `assign` - Assign issue
- [ ] `comment` - Add comment
- [ ] Quick actions (`start`, `done`)

### Phase 4: Session Memory
- [ ] Session memory storage and schema
- [ ] `context` - Load session context for Claude
- [ ] `focus` - Mark tickets as focus
- [ ] `session-save` - Save session summary
- [ ] `sessions` - View session history
- [ ] Auto-tracking on all mutations
- [ ] Auto-summarization after N actions

### Phase 5: Advanced Features
- [ ] `batch-update` - Batch operations
- [ ] `project-create` - Create project
- [ ] `cycle-create` - Create cycle
- [ ] Interactive `init` setup wizard
- [ ] `sync` - Refresh tracked tickets from Linear

## Dependencies

```json
{
  "dependencies": {
    "@linear/sdk": "^27.0.0",
    "dotenv": "^16.3.1",
    "yargs": "^17.7.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/yargs": "^17.0.32",
    "typescript": "^5.3.0",
    "vitest": "^1.1.0"
  }
}
```

## Common Workflow Examples

### Sprint Planning
```bash
# List current cycle issues
npx linear-skill issues --cycle current --team ENG

# Move issues to new cycle
npx linear-skill batch-move --ids "ENG-1,ENG-2,ENG-3" --cycle <new-cycle-id>

# Create new issues for sprint
npx linear-skill create "Implement auth" --team ENG --cycle <cycle-id> --priority 1
```

### Daily Standup
```bash
# My assigned issues
npx linear-skill issues --assignee me --state "In Progress"

# Issues I completed yesterday
npx linear-skill issues --assignee me --state "Done" --updated-since yesterday
```

### Bug Triage
```bash
# Search for bug reports
npx linear-skill search "bug" --team ENG --state "Backlog"

# Quick prioritization
npx linear-skill update ENG-456 --priority 1 --label "urgent"
npx linear-skill assign ENG-456 me
npx linear-skill start ENG-456
```

## Advantages Over MCP Server

1. **Reduced Context Window Usage**: Only loads commands when skill is invoked
2. **Simpler Architecture**: No persistent server process
3. **Faster Startup**: Direct CLI execution
4. **Better Caching**: Local cache with TTL vs. MCP's full entity loading
5. **Explicit Control**: Clear command structure vs. implicit tool selection
6. **Offline Capability**: Cache allows viewing recent data offline

## Skill Integration

### SKILL.md Template
```markdown
---
name: linear
description: Manage Linear issues, projects, and cycles. Use for creating issues, tracking work, sprint planning. Maintains session memory across conversations.
---

# Linear Skill

Manage your Linear workspace from the command line with persistent session memory.

## Starting a Session

**Always load context first** to see what you were working on:

\`\`\`bash
npx linear-skill context
\`\`\`

This shows:
- Recent session summaries
- Focus tickets from last session
- Recent actions taken

## Quick Start

\`\`\`bash
# Setup (one time)
npx linear-skill init

# Load previous context
npx linear-skill context

# Common operations
npx linear-skill issues --assignee me
npx linear-skill create "Fix bug" --team ENG
npx linear-skill update ENG-123 --state "Done"

# Mark tickets as current focus
npx linear-skill focus ENG-123 ENG-456

# Save session before ending
npx linear-skill session-save "Completed auth work, PR ready for review"
\`\`\`

## Session Memory

The skill remembers your recent work across conversations:

- **Auto-tracking**: All issue interactions are logged
- **Focus tickets**: Mark what you're actively working on
- **Session summaries**: 2-3 recent session summaries are kept
- **Context command**: Loads this into new conversations

## Command Categories

- **Read**: `issues`, `issue`, `search`, `projects`, `cycles`, `teams`
- **Write**: `create`, `update`, `assign`, `comment`, `start`, `done`
- **Session**: `context`, `focus`, `session-save`, `sessions`
- **Config**: `init`, `config`, `workspace`, `cache-refresh`

[See REFERENCE.md for full command documentation]
[See SESSION.md for session memory details]
```

---

## Example Conversation Flow

### New Conversation (Day 2)

**User**: "What Linear tickets was I working on?"

**Claude**: Let me check your session context.
```bash
npx linear-skill context
```

**Output**:
```json
{
  "lastSession": {
    "timestamp": "2025-12-27T18:00:00Z",
    "summary": "Sprint planning: moved ENG-123, ENG-124, ENG-125 to current cycle. Started work on ENG-123 (auth refactor). Blocked on API keys from DevOps."
  },
  "focusTickets": [
    {"id": "ENG-123", "title": "Implement SSO login", "state": "In Progress"},
    {"id": "ENG-124", "title": "Add logout endpoint", "state": "Backlog"}
  ],
  "notes": "Blocked on API keys from DevOps"
}
```

**Claude**: "Yesterday you were working on sprint planning and started the auth refactor. Your focus tickets are ENG-123 (SSO login, In Progress) and ENG-124 (logout endpoint). You noted you're blocked on API keys from DevOps."

---

## Next Steps

1. Create the skill directory structure
2. Initialize npm project with dependencies
3. Implement Phase 1 (Core Infrastructure)
4. Implement Phase 2 (Read Operations)
5. Implement Phase 3 (Write Operations with auto-tracking)
6. Implement Phase 4 (Session Memory)
7. Test with real Linear workspace
8. Document and iterate
