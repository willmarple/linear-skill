# Session Memory Guide

The session memory feature maintains context across Claude conversations, solving the "new conversation amnesia" problem.

## The Problem

```
Conversation 1: "Update ENG-123, ENG-456, ENG-789 to In Progress"
[Claude does the work, conversation ends]

Conversation 2: "What was I working on?"
[Without session memory, Claude has no idea]
```

## The Solution

The skill maintains a rolling session memory with:
- Last 2-3 work session summaries
- Currently active/focus tickets
- Recent changes made via the skill
- Working notes

## How It Works

### Auto-Tracking

Every time you use the skill to interact with an issue, it's automatically tracked:

```bash
npx linear-skill issue ENG-123      # Tracked as "viewed"
npx linear-skill create "..."       # Tracked as "created"
npx linear-skill update ENG-123 ... # Tracked as "updated"
npx linear-skill comment ENG-123 ...# Tracked as "commented"
npx linear-skill assign ENG-123 me  # Tracked as "assigned"
```

### Focus Tickets

Mark tickets you're actively working on:

```bash
# Set focus to specific tickets
npx linear-skill focus ENG-123 ENG-456

# Add to existing focus
npx linear-skill focus --add ENG-789

# Remove from focus
npx linear-skill focus --remove ENG-123

# Clear all focus
npx linear-skill focus --clear

# View current focus
npx linear-skill focus
```

### Session Notes

Leave notes for your future self:

```bash
npx linear-skill notes "Waiting on API keys from DevOps"
npx linear-skill notes "Need to discuss approach with team"
```

### Session Summaries

Save a summary when ending a work session:

```bash
# Auto-generate from recent actions
npx linear-skill session-save

# Custom summary
npx linear-skill session-save "Completed auth refactor, PR ready for review"
```

## Loading Context

At the start of each conversation, load your context:

```bash
npx linear-skill context
```

Output:

```json
{
  "success": true,
  "command": "context",
  "data": {
    "sessionContext": {
      "lastActive": "2 hours ago",
      "summary": "Sprint planning: moved ENG-123 to In Progress, created ENG-789 for logout.",
      "focusTickets": [
        {"id": "ENG-123", "title": "Implement SSO", "state": "In Progress"},
        {"id": "ENG-456", "title": "Fix token bug", "state": "In Review"}
      ],
      "recentActions": [
        "update ENG-123: state=In Progress",
        "create ENG-789: title=Add logout endpoint"
      ],
      "notes": "Waiting on API keys from DevOps"
    }
  }
}
```

## Session Memory Schema

The session memory is stored in `session-memory.json`:

```json
{
  "version": 1,
  "updatedAt": "2025-12-28T21:34:10Z",

  "activeContext": {
    "focusTickets": ["ENG-123", "ENG-456"],
    "activeBranch": "feature/auth-refactor",
    "notes": "Waiting on API keys"
  },

  "trackedTickets": [
    {
      "identifier": "ENG-123",
      "title": "Implement SSO login",
      "state": "In Progress",
      "priority": 1,
      "lastInteraction": "2025-12-28T20:00:00Z",
      "interactionType": "updated",
      "summary": "Moved to In Progress"
    }
  ],

  "recentActions": [
    {
      "timestamp": "2025-12-28T21:30:00Z",
      "action": "update",
      "ticket": "ENG-123",
      "changes": {"state": "In Progress"}
    }
  ],

  "sessionSummaries": [
    {
      "id": "session-1234567890",
      "timestamp": "2025-12-28T21:30:00Z",
      "summary": "Sprint planning: moved 3 tickets to current cycle.",
      "ticketsInvolved": ["ENG-123", "ENG-456", "ENG-789"],
      "actionCount": 5
    }
  ]
}
```

## Configuration

In `config.json`, you can adjust session memory limits:

```json
{
  "preferences": {
    "sessionMemoryEnabled": true,
    "maxTrackedTickets": 20,
    "maxRecentActions": 50,
    "maxSessionSummaries": 3
  }
}
```

## Best Practices

1. **Start with context**: Always run `npx linear-skill context` at the start of a Linear-related conversation.

2. **Set focus early**: When you know what you're working on, set focus tickets so they're easy to reference later.

3. **Save summaries**: Before ending a work session, save a summary with key decisions or next steps.

4. **Use notes for blockers**: If you're waiting on something, note it so you remember in the next session.

5. **Clear old data periodically**: Use `session-clear --older-than 7` to keep the memory clean.

## Workflow Example

### Morning (New Conversation)

```bash
# Load yesterday's context
npx linear-skill context

# Continue where you left off
npx linear-skill issues --assignee me --state "In Progress"
```

### During Work

```bash
# Work on issues (auto-tracked)
npx linear-skill start ENG-123
npx linear-skill update ENG-123 --description "Added tests"
npx linear-skill comment ENG-456 "Fixed in PR #123"
npx linear-skill done ENG-456
```

### End of Day

```bash
# Save session
npx linear-skill session-save "Completed ENG-456, ENG-123 in progress. Waiting on code review."
```

### Next Day (New Conversation)

```bash
npx linear-skill context
# Shows: "Completed ENG-456, ENG-123 in progress. Waiting on code review."
```
