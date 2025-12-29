import { readFileSync, writeFileSync, existsSync } from 'fs';
import { PATHS, getConfigManager } from '../config/index.js';
import {
  SessionMemory,
  TrackedTicket,
  RecentAction,
  SessionSummary,
  ActiveContext,
} from '../types/index.js';

const SESSION_VERSION = 1;

function createEmptySession(): SessionMemory {
  return {
    version: SESSION_VERSION,
    updatedAt: new Date().toISOString(),
    activeContext: {
      focusTickets: [],
    },
    trackedTickets: [],
    recentActions: [],
    sessionSummaries: [],
  };
}

export class SessionManager {
  private session: SessionMemory;
  private maxTrackedTickets: number;
  private maxRecentActions: number;
  private maxSessionSummaries: number;

  constructor() {
    const config = getConfigManager();
    const prefs = config.getPreferences();

    this.maxTrackedTickets = prefs.maxTrackedTickets;
    this.maxRecentActions = prefs.maxRecentActions;
    this.maxSessionSummaries = prefs.maxSessionSummaries;

    this.session = this.loadSession();
  }

  private loadSession(): SessionMemory {
    if (!existsSync(PATHS.sessionMemory)) {
      return createEmptySession();
    }

    try {
      const raw = readFileSync(PATHS.sessionMemory, 'utf-8');
      const parsed = JSON.parse(raw) as SessionMemory;

      if (parsed.version !== SESSION_VERSION) {
        return createEmptySession();
      }

      return parsed;
    } catch {
      return createEmptySession();
    }
  }

  private save(): void {
    this.session.updatedAt = new Date().toISOString();
    writeFileSync(PATHS.sessionMemory, JSON.stringify(this.session, null, 2));
  }

  // ============================================================================
  // Context
  // ============================================================================

  getContext(): SessionMemory {
    return this.session;
  }

  getActiveContext(): ActiveContext {
    return this.session.activeContext;
  }

  setFocusTickets(identifiers: string[]): void {
    this.session.activeContext.focusTickets = identifiers;
    this.save();
  }

  addFocusTicket(identifier: string): void {
    if (!this.session.activeContext.focusTickets.includes(identifier)) {
      this.session.activeContext.focusTickets.push(identifier);
      this.save();
    }
  }

  removeFocusTicket(identifier: string): void {
    this.session.activeContext.focusTickets =
      this.session.activeContext.focusTickets.filter((t) => t !== identifier);
    this.save();
  }

  clearFocus(): void {
    this.session.activeContext.focusTickets = [];
    this.save();
  }

  setActiveBranch(branch: string | undefined): void {
    this.session.activeContext.activeBranch = branch;
    this.save();
  }

  setActiveProject(project: string | undefined): void {
    this.session.activeContext.activeProject = project;
    this.save();
  }

  setNotes(notes: string | undefined): void {
    this.session.activeContext.notes = notes;
    this.save();
  }

  // ============================================================================
  // Tracked Tickets
  // ============================================================================

  trackTicket(ticket: Omit<TrackedTicket, 'lastInteraction'>): void {
    const existing = this.session.trackedTickets.findIndex(
      (t) => t.identifier === ticket.identifier
    );

    const trackedTicket: TrackedTicket = {
      ...ticket,
      lastInteraction: new Date().toISOString(),
    };

    if (existing >= 0) {
      this.session.trackedTickets[existing] = trackedTicket;
    } else {
      this.session.trackedTickets.unshift(trackedTicket);
    }

    // Trim to max
    if (this.session.trackedTickets.length > this.maxTrackedTickets) {
      this.session.trackedTickets = this.session.trackedTickets.slice(
        0,
        this.maxTrackedTickets
      );
    }

    this.save();
  }

  getTrackedTickets(): TrackedTicket[] {
    return this.session.trackedTickets;
  }

  getTrackedTicket(identifier: string): TrackedTicket | undefined {
    return this.session.trackedTickets.find((t) => t.identifier === identifier);
  }

  // ============================================================================
  // Recent Actions
  // ============================================================================

  logAction(action: Omit<RecentAction, 'timestamp'>): void {
    this.session.recentActions.unshift({
      ...action,
      timestamp: new Date().toISOString(),
    });

    // Trim to max
    if (this.session.recentActions.length > this.maxRecentActions) {
      this.session.recentActions = this.session.recentActions.slice(
        0,
        this.maxRecentActions
      );
    }

    this.save();
  }

  getRecentActions(limit?: number): RecentAction[] {
    const actions = this.session.recentActions;
    return limit ? actions.slice(0, limit) : actions;
  }

  // ============================================================================
  // Session Summaries
  // ============================================================================

  addSessionSummary(summary: Omit<SessionSummary, 'id' | 'timestamp'>): void {
    const sessionSummary: SessionSummary = {
      ...summary,
      id: `session-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    this.session.sessionSummaries.unshift(sessionSummary);

    // Trim to max
    if (this.session.sessionSummaries.length > this.maxSessionSummaries) {
      this.session.sessionSummaries = this.session.sessionSummaries.slice(
        0,
        this.maxSessionSummaries
      );
    }

    this.save();
  }

  getSessionSummaries(): SessionSummary[] {
    return this.session.sessionSummaries;
  }

  getLastSessionSummary(): SessionSummary | undefined {
    return this.session.sessionSummaries[0];
  }

  // ============================================================================
  // Context for Claude
  // ============================================================================

  getContextForClaude(): {
    lastActive: string;
    summary: string;
    focusTickets: Array<{ id: string; title: string; state: string }>;
    recentActions: string[];
    notes?: string;
  } {
    const lastSummary = this.getLastSessionSummary();
    const focusIds = this.session.activeContext.focusTickets;
    const focusTickets = focusIds
      .map((id) => {
        const ticket = this.getTrackedTicket(id);
        return ticket
          ? { id: ticket.identifier, title: ticket.title, state: ticket.state }
          : null;
      })
      .filter((t): t is { id: string; title: string; state: string } => t !== null);

    const recentActions = this.getRecentActions(5).map((a) => {
      const changes = Object.entries(a.changes)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `${a.action} ${a.ticket}${changes ? `: ${changes}` : ''}`;
    });

    // Calculate time since last activity
    const lastUpdate = new Date(this.session.updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let lastActive: string;
    if (diffDays > 0) {
      lastActive = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      lastActive = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      lastActive = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      lastActive = 'just now';
    }

    return {
      lastActive,
      summary: lastSummary?.summary || 'No previous session recorded.',
      focusTickets,
      recentActions,
      notes: this.session.activeContext.notes,
    };
  }

  // ============================================================================
  // Clear
  // ============================================================================

  clear(): void {
    this.session = createEmptySession();
    this.save();
  }

  clearOlderThan(days: number): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    this.session.trackedTickets = this.session.trackedTickets.filter(
      (t) => t.lastInteraction > cutoffStr
    );
    this.session.recentActions = this.session.recentActions.filter(
      (a) => a.timestamp > cutoffStr
    );
    this.session.sessionSummaries = this.session.sessionSummaries.filter(
      (s) => s.timestamp > cutoffStr
    );

    this.save();
  }
}

// Singleton instance
let sessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}

export function resetSessionManager(): void {
  sessionManager = null;
}
