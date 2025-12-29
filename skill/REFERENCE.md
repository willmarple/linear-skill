# Linear Skill Command Reference

Complete documentation for all CLI commands.

## Global Response Format

All commands return JSON:

```json
{
  "success": true,
  "command": "issues",
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "command": "issues",
  "error": {
    "code": "NOT_FOUND",
    "message": "Team 'INVALID' not found"
  }
}
```

---

## Read Commands

### teams

List all teams in the workspace.

```bash
npx linear-skill teams
```

### users

List users or get current user.

```bash
npx linear-skill users
npx linear-skill users --me
```

### states

List workflow states for a team.

```bash
npx linear-skill states --team ENG
```

### projects

List projects, optionally filtered by team.

```bash
npx linear-skill projects
npx linear-skill projects --team ENG
```

### project

Get project details.

```bash
npx linear-skill project <project-id>
```

### cycles

List cycles for a team.

```bash
npx linear-skill cycles --team ENG
npx linear-skill cycles --team ENG --active
```

### issues

List issues with filters.

```bash
npx linear-skill issues [options]
```

**Options:**
- `--team, -t` - Filter by team key
- `--project, -p` - Filter by project ID
- `--cycle, -c` - Filter by cycle ID
- `--assignee, -a` - Filter by assignee (ID, email, or "me")
- `--state, -s` - Filter by state name
- `--limit, -l` - Max results (default: 50)

### issue

Get issue details.

```bash
npx linear-skill issue <identifier>
npx linear-skill issue ENG-123
```

### search

Search for issues.

```bash
npx linear-skill search "<query>" [options]
```

**Options:**
- `--team, -t` - Filter by team
- `--limit, -l` - Max results (default: 20)

---

## Write Commands

### create

Create a new issue.

```bash
npx linear-skill create "<title>" --team <team> [options]
```

**Options:**
- `--team, -t` - Team key (required)
- `--description, -d` - Description
- `--project, -p` - Project ID
- `--cycle, -c` - Cycle ID
- `--assignee, -a` - Assignee (ID, email, or "me")
- `--state, -s` - Initial state name
- `--priority` - Priority (0-4)
- `--labels, -l` - Comma-separated label IDs

### update

Update an issue.

```bash
npx linear-skill update <identifier> [options]
```

**Options:**
- `--title` - New title
- `--description, -d` - New description
- `--project, -p` - Move to project (or "none")
- `--cycle, -c` - Move to cycle (or "none")
- `--assignee, -a` - Assign to user (or "none")
- `--state, -s` - Change state
- `--priority` - Priority (0-4)

### start

Quick action: Move issue to "In Progress".

```bash
npx linear-skill start <identifier>
```

### done

Quick action: Move issue to "Done".

```bash
npx linear-skill done <identifier>
```

### assign

Assign issue to a user.

```bash
npx linear-skill assign <identifier> <user>
npx linear-skill assign ENG-123 me
npx linear-skill assign ENG-123 user@example.com
npx linear-skill assign ENG-123 none
```

### comment

Add a comment to an issue.

```bash
npx linear-skill comment <identifier> "<body>"
```

---

## Session Commands

### context

Load session context. **Use at the start of each conversation.**

```bash
npx linear-skill context
npx linear-skill context --detailed
npx linear-skill context --for-claude
```

### focus

Set or view focus tickets.

```bash
npx linear-skill focus                    # Show current focus
npx linear-skill focus ENG-123 ENG-456    # Set focus tickets
npx linear-skill focus --add ENG-789      # Add to focus
npx linear-skill focus --remove ENG-123   # Remove from focus
npx linear-skill focus --clear            # Clear all focus
```

### notes

Set or view session notes.

```bash
npx linear-skill notes                    # Show notes
npx linear-skill notes "reminder text"    # Set notes
npx linear-skill notes --clear            # Clear notes
```

### session-save

Save a session summary.

```bash
npx linear-skill session-save                    # Auto-generate
npx linear-skill session-save "Custom summary"   # Custom summary
```

### sessions

View session history.

```bash
npx linear-skill sessions
npx linear-skill sessions --limit 5
```

### session-clear

Clear session data.

```bash
npx linear-skill session-clear --older-than 7   # Clear data > 7 days old
npx linear-skill session-clear --all            # Clear everything
```

---

## Config Commands

### init

Initialize configuration files.

```bash
npx linear-skill init
```

### config

Show current configuration.

```bash
npx linear-skill config
```

### config-set

Set a configuration value.

```bash
npx linear-skill config-set team ENG
npx linear-skill config-set defaultProject <project-id>
```

### cache-refresh

Force refresh the cache.

```bash
npx linear-skill cache-refresh
```

### cache-status

Show cache status.

```bash
npx linear-skill cache-status
```

### cache-clear

Clear the cache.

```bash
npx linear-skill cache-clear
```

---

## Priority Values

| Value | Label |
|-------|-------|
| 0 | No priority |
| 1 | Urgent |
| 2 | High |
| 3 | Normal |
| 4 | Low |

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_ERROR` | Missing or invalid API key |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid input |
| `RATE_LIMITED` | API rate limit exceeded |
| `PERMISSION_DENIED` | Insufficient permissions |
| `UNKNOWN_ERROR` | Unexpected error |
