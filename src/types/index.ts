import { z } from 'zod';

// ============================================================================
// Configuration Types
// ============================================================================

export const PreferencesSchema = z.object({
  outputFormat: z.enum(['json', 'text']).default('json'),
  cacheEnabled: z.boolean().default(true),
  cacheTtlMinutes: z.number().default(60),
  sessionMemoryEnabled: z.boolean().default(true),
  maxTrackedTickets: z.number().default(20),
  maxRecentActions: z.number().default(50),
  maxSessionSummaries: z.number().default(3),
});

export const WorkflowSchema = z.object({
  defaultState: z.string().optional(),
  defaultPriority: z.number().optional(),
  defaultLabels: z.array(z.string()).optional(),
});

export const ConfigSchema = z.object({
  version: z.number().default(1),
  team: z.string().optional(),
  defaultProject: z.string().nullable().optional(),
  allowedTeams: z.array(z.string()).default([]),
  allowedProjects: z.array(z.string()).default([]),
  labels: z.record(z.string()).default({}),
  workflows: z.record(WorkflowSchema).default({}),
  preferences: PreferencesSchema.default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;

// ============================================================================
// Cache Types
// ============================================================================

export interface CachedTeam {
  id: string;
  key: string;
  name: string;
}

export interface CachedUser {
  id: string;
  name: string;
  email: string;
  displayName: string;
}

export interface CachedWorkflowState {
  id: string;
  name: string;
  type: string;
  color: string;
  position: number;
  teamId: string;
}

export interface CachedProject {
  id: string;
  name: string;
  state: string;
  teamIds: string[];
}

export interface CachedLabel {
  id: string;
  name: string;
  color: string;
  teamId?: string;
}

export interface CacheData {
  teams: CachedTeam[];
  users: CachedUser[];
  states: Record<string, CachedWorkflowState[]>; // keyed by teamId
  projects: CachedProject[];
  labels: CachedLabel[];
}

export interface CacheStore {
  version: number;
  lastRefresh: string;
  ttlMinutes: number;
  data: CacheData;
}

// ============================================================================
// Session Memory Types
// ============================================================================

export interface TrackedTicket {
  identifier: string;
  title: string;
  state: string;
  priority: number | null;
  lastInteraction: string;
  interactionType: 'viewed' | 'created' | 'updated' | 'commented' | 'assigned';
  summary: string;
}

export interface RecentAction {
  timestamp: string;
  action: 'create' | 'update' | 'comment' | 'assign' | 'view';
  ticket: string;
  changes: Record<string, unknown>;
}

export interface SessionSummary {
  id: string;
  timestamp: string;
  summary: string;
  ticketsInvolved: string[];
  actionCount: number;
}

export interface ActiveContext {
  focusTickets: string[];
  activeBranch?: string;
  activeProject?: string;
  notes?: string;
}

export interface SessionMemory {
  version: number;
  updatedAt: string;
  activeContext: ActiveContext;
  trackedTickets: TrackedTicket[];
  recentActions: RecentAction[];
  sessionSummaries: SessionSummary[];
}

// ============================================================================
// CLI Response Types
// ============================================================================

export interface CliResponse<T = unknown> {
  success: boolean;
  command: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Linear Entity Types (simplified for CLI output)
// ============================================================================

export interface IssueOutput {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: { id: string; name: string };
  assignee?: { id: string; name: string };
  project?: { id: string; name: string };
  cycle?: { id: string; name?: string; number: number };
  priority: number;
  priorityLabel: string;
  labels: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface ProjectOutput {
  id: string;
  name: string;
  description?: string;
  state: string;
  progress: number;
  targetDate?: string;
  startDate?: string;
  lead?: { id: string; name: string };
  teams: { id: string; name: string }[];
  url: string;
}

export interface CycleOutput {
  id: string;
  number: number;
  name?: string;
  startsAt: string;
  endsAt: string;
  progress: number;
  team: { id: string; name: string };
}

export interface TeamOutput {
  id: string;
  key: string;
  name: string;
  description?: string;
}

export interface UserOutput {
  id: string;
  name: string;
  email: string;
  displayName: string;
  active: boolean;
}

export interface CommentOutput {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string };
}

export interface AttachmentOutput {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  sourceType?: string;
  createdAt: string;
}

export interface InlineImageOutput {
  alt: string;
  url: string;
  source: 'description' | 'comment';
  commentId?: string;
}

export interface IssueWithCommentsOutput extends IssueOutput {
  comments: CommentOutput[];
  attachments?: AttachmentOutput[];
  inlineImages?: InlineImageOutput[];
}
