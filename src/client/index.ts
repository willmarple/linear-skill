import { LinearClient as LinearSDK } from '@linear/sdk';
import { getConfigManager } from '../config/index.js';
import { getCacheManager } from '../cache/index.js';
import {
  IssueOutput,
  ProjectOutput,
  CycleOutput,
  TeamOutput,
  UserOutput,
  CommentOutput,
  IssueWithCommentsOutput,
  AttachmentOutput,
  InlineImageOutput,
  NotificationOutput,
  CachedTeam,
  CachedUser,
  CachedWorkflowState,
  CachedProject,
  CachedLabel,
} from '../types/index.js';

export class LinearClient {
  private client: LinearSDK;
  private cache = getCacheManager();

  constructor() {
    const config = getConfigManager();
    this.client = new LinearSDK({
      apiKey: config.getApiKey(),
      // Enable signed URLs for attachments (valid for 1 hour)
      // This header causes Linear to return temporary public URLs for file attachments
      headers: {
        'public-file-urls-expire-in': '3600',
      },
    });
  }

  // ============================================================================
  // Cache Refresh
  // ============================================================================

  async refreshCache(): Promise<void> {
    const [teams, users, projects, labels] = await Promise.all([
      this.fetchTeams(),
      this.fetchUsers(),
      this.fetchProjects(),
      this.fetchLabels(),
    ]);

    // Fetch workflow states for each team
    const statesMap: Record<string, CachedWorkflowState[]> = {};
    for (const team of teams) {
      const states = await this.fetchWorkflowStates(team.id);
      statesMap[team.id] = states;
    }

    this.cache.setAll({
      teams,
      users,
      states: statesMap,
      projects,
      labels,
    });
  }

  async ensureCacheReady(): Promise<void> {
    if (this.cache.needsRefresh()) {
      await this.refreshCache();
    }
  }

  // ============================================================================
  // Teams
  // ============================================================================

  private async fetchTeams(): Promise<CachedTeam[]> {
    const teams = await this.client.teams();
    return teams.nodes.map((t) => ({
      id: t.id,
      key: t.key,
      name: t.name,
    }));
  }

  async getTeams(): Promise<TeamOutput[]> {
    const teams = await this.client.teams();
    return teams.nodes.map((t) => ({
      id: t.id,
      key: t.key,
      name: t.name,
      description: t.description || undefined,
    }));
  }

  async getTeam(idOrKey: string): Promise<TeamOutput | null> {
    try {
      const team = await this.client.team(idOrKey);
      return {
        id: team.id,
        key: team.key,
        name: team.name,
        description: team.description || undefined,
      };
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Users
  // ============================================================================

  private async fetchUsers(): Promise<CachedUser[]> {
    const users = await this.client.users();
    return users.nodes.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      displayName: u.displayName,
    }));
  }

  async getUsers(): Promise<UserOutput[]> {
    const users = await this.client.users();
    return users.nodes.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      displayName: u.displayName,
      active: u.active,
    }));
  }

  async getMe(): Promise<UserOutput> {
    const me = await this.client.viewer;
    return {
      id: me.id,
      name: me.name,
      email: me.email,
      displayName: me.displayName,
      active: me.active,
    };
  }

  // ============================================================================
  // Workflow States
  // ============================================================================

  private async fetchWorkflowStates(teamId: string): Promise<CachedWorkflowState[]> {
    const team = await this.client.team(teamId);
    const states = await team.states();
    return states.nodes.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      color: s.color,
      position: s.position,
      teamId,
    }));
  }

  async getWorkflowStates(teamId: string): Promise<CachedWorkflowState[]> {
    await this.ensureCacheReady();
    return this.cache.getStatesForTeam(teamId);
  }

  // ============================================================================
  // Projects
  // ============================================================================

  private async fetchProjects(): Promise<CachedProject[]> {
    const projects = await this.client.projects();
    const result: CachedProject[] = [];

    for (const p of projects.nodes) {
      const teams = await p.teams();
      result.push({
        id: p.id,
        name: p.name,
        state: p.state,
        teamIds: teams.nodes.map((t) => t.id),
      });
    }

    return result;
  }

  async getProjects(teamId?: string): Promise<ProjectOutput[]> {
    const projects = await this.client.projects({
      filter: teamId ? { accessibleTeams: { id: { eq: teamId } } } : undefined,
    });

    const result: ProjectOutput[] = [];
    for (const p of projects.nodes) {
      const teams = await p.teams();
      const lead = await p.lead;

      result.push({
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        state: p.state,
        progress: p.progress,
        targetDate: p.targetDate || undefined,
        startDate: p.startDate || undefined,
        lead: lead ? { id: lead.id, name: lead.name } : undefined,
        teams: teams.nodes.map((t) => ({ id: t.id, name: t.name })),
        url: p.url,
      });
    }

    return result;
  }

  async getProject(id: string): Promise<ProjectOutput | null> {
    try {
      const p = await this.client.project(id);
      const teams = await p.teams();
      const lead = await p.lead;

      return {
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        state: p.state,
        progress: p.progress,
        targetDate: p.targetDate || undefined,
        startDate: p.startDate || undefined,
        lead: lead ? { id: lead.id, name: lead.name } : undefined,
        teams: teams.nodes.map((t) => ({ id: t.id, name: t.name })),
        url: p.url,
      };
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Cycles
  // ============================================================================

  async getCycles(teamId: string): Promise<CycleOutput[]> {
    const team = await this.client.team(teamId);
    const cycles = await team.cycles();

    return cycles.nodes.map((c) => ({
      id: c.id,
      number: c.number,
      name: c.name || undefined,
      startsAt: c.startsAt?.toISOString() || '',
      endsAt: c.endsAt?.toISOString() || '',
      progress: c.progress,
      team: { id: teamId, name: team.name },
    }));
  }

  async getActiveCycle(teamId: string): Promise<CycleOutput | null> {
    const team = await this.client.team(teamId);
    const cycle = await team.activeCycle;

    if (!cycle) return null;

    return {
      id: cycle.id,
      number: cycle.number,
      name: cycle.name || undefined,
      startsAt: cycle.startsAt?.toISOString() || '',
      endsAt: cycle.endsAt?.toISOString() || '',
      progress: cycle.progress,
      team: { id: teamId, name: team.name },
    };
  }

  // ============================================================================
  // Labels
  // ============================================================================

  private async fetchLabels(): Promise<CachedLabel[]> {
    const labels = await this.client.issueLabels();
    const result: CachedLabel[] = [];

    for (const l of labels.nodes) {
      const team = await l.team;
      result.push({
        id: l.id,
        name: l.name,
        color: l.color,
        teamId: team?.id,
      });
    }

    return result;
  }

  // ============================================================================
  // Notifications/Inbox
  // ============================================================================

  async getNotifications(options?: {
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<NotificationOutput[]> {
    // Use the SDK's notifications() method (root query, not on viewer)
    const notifications = await this.client.notifications({
      first: options?.limit || 50,
    });

    const result: NotificationOutput[] = [];

    for (const n of notifications.nodes) {
      // Skip read notifications if unreadOnly is true
      if (options?.unreadOnly && n.readAt) {
        continue;
      }

      // Resolve related entities
      const actor = await n.actor;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notificationAny = n as any;

      // Try to resolve issue and comment - not all notification types have these
      let issue = null;
      let comment = null;
      try {
        if ('issue' in notificationAny) {
          issue = await notificationAny.issue;
        }
      } catch {
        // Notification type doesn't have issue
      }
      try {
        if ('comment' in notificationAny) {
          comment = await notificationAny.comment;
        }
      } catch {
        // Notification type doesn't have comment
      }

      let issueData: NotificationOutput['issue'];
      if (issue) {
        const state = await issue.state;
        const team = await issue.team;
        issueData = {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          state: state ? { id: state.id, name: state.name } : undefined,
          team: team ? { id: team.id, key: team.key, name: team.name } : undefined,
        };
      }

      let commentData: NotificationOutput['comment'];
      if (comment) {
        commentData = {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt instanceof Date
            ? comment.createdAt.toISOString()
            : String(comment.createdAt),
        };
      }

      result.push({
        id: n.id,
        type: n.type,
        readAt: n.readAt instanceof Date
          ? n.readAt.toISOString()
          : n.readAt ? String(n.readAt) : undefined,
        createdAt: n.createdAt instanceof Date
          ? n.createdAt.toISOString()
          : String(n.createdAt),
        actor: actor ? {
          id: actor.id,
          name: actor.name,
          email: actor.email,
        } : undefined,
        issue: issueData,
        comment: commentData,
      });
    }

    // Sort by createdAt descending (most recent first)
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }

  // ============================================================================
  // Issues
  // ============================================================================

  async getIssues(options: {
    teamId?: string;
    projectId?: string;
    projectIds?: string[];
    cycleId?: string;
    assigneeId?: string;
    stateId?: string;
    stateIds?: string[];
    stateNames?: string[];
    priorities?: number[];
    labelNames?: string[];
    limit?: number;
  }): Promise<IssueOutput[]> {
    const filter: Record<string, unknown> = {};

    if (options.teamId) filter.team = { id: { eq: options.teamId } };

    // Project filtering - single or multiple
    if (options.projectIds && options.projectIds.length > 0) {
      filter.project = { id: { in: options.projectIds } };
    } else if (options.projectId) {
      filter.project = { id: { eq: options.projectId } };
    }

    if (options.cycleId) filter.cycle = { id: { eq: options.cycleId } };
    if (options.assigneeId) filter.assignee = { id: { eq: options.assigneeId } };

    // State filtering - by ID(s) or name(s)
    if (options.stateIds && options.stateIds.length > 0) {
      filter.state = { id: { in: options.stateIds } };
    } else if (options.stateNames && options.stateNames.length > 0) {
      filter.state = { name: { in: options.stateNames } };
    } else if (options.stateId) {
      filter.state = { id: { eq: options.stateId } };
    }

    // Priority filtering - supports multiple priorities with 'in' operator
    if (options.priorities && options.priorities.length > 0) {
      filter.priority = { in: options.priorities };
    }

    // Label filtering - matches issues that have ANY of the specified labels
    if (options.labelNames && options.labelNames.length > 0) {
      filter.labels = { some: { name: { in: options.labelNames } } };
    }

    const issues = await this.client.issues({
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      first: options.limit || 50,
    });

    return this.mapIssuesToOutput(issues.nodes);
  }

  async getIssue(idOrIdentifier: string): Promise<IssueOutput | null> {
    try {
      const issue = await this.client.issue(idOrIdentifier);
      const mapped = await this.mapIssuesToOutput([issue]);
      return mapped[0] || null;
    } catch {
      return null;
    }
  }

  async getIssueWithComments(idOrIdentifier: string): Promise<IssueWithCommentsOutput | null> {
    try {
      const issue = await this.client.issue(idOrIdentifier);
      const mapped = await this.mapIssuesToOutput([issue]);
      if (!mapped[0]) return null;

      const comments = await this.getComments(issue.id);
      const attachments = await this.getAttachments(issue.id);

      // Extract inline images from description and comments
      const inlineImages: InlineImageOutput[] = [];

      // From description
      if (mapped[0].description) {
        const descImages = this.extractInlineImages(mapped[0].description, 'description');
        inlineImages.push(...descImages);
      }

      // From comments
      for (const comment of comments) {
        const commentImages = this.extractInlineImages(comment.body, 'comment', comment.id);
        inlineImages.push(...commentImages);
      }

      return {
        ...mapped[0],
        comments,
        attachments: attachments.length > 0 ? attachments : undefined,
        inlineImages: inlineImages.length > 0 ? inlineImages : undefined,
      };
    } catch {
      return null;
    }
  }

  async getAttachments(issueId: string): Promise<AttachmentOutput[]> {
    try {
      const issue = await this.client.issue(issueId);
      const attachments = await issue.attachments();

      return attachments.nodes.map((a) => ({
        id: a.id,
        title: a.title,
        subtitle: a.subtitle || undefined,
        url: a.url,
        sourceType: a.sourceType || undefined,
        createdAt: a.createdAt instanceof Date
          ? a.createdAt.toISOString()
          : String(a.createdAt),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Extract inline image URLs from markdown content.
   * Matches patterns like: ![alt text](url)
   */
  extractInlineImages(
    markdown: string,
    source: 'description' | 'comment',
    commentId?: string
  ): InlineImageOutput[] {
    const images: InlineImageOutput[] = [];
    // Match markdown image syntax: ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = imageRegex.exec(markdown)) !== null) {
      images.push({
        alt: match[1] || 'image',
        url: match[2],
        source,
        commentId: source === 'comment' ? commentId : undefined,
      });
    }

    return images;
  }

  async getComments(issueId: string): Promise<CommentOutput[]> {
    try {
      const issue = await this.client.issue(issueId);
      const comments = await issue.comments();

      const result: CommentOutput[] = [];
      for (const comment of comments.nodes) {
        const user = await comment.user;
        result.push({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt instanceof Date
            ? comment.createdAt.toISOString()
            : String(comment.createdAt),
          updatedAt: comment.updatedAt instanceof Date
            ? comment.updatedAt.toISOString()
            : String(comment.updatedAt),
          user: user ? { id: user.id, name: user.name, email: user.email } : undefined,
        });
      }

      // Sort by createdAt ascending (oldest first)
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return result;
    } catch {
      return [];
    }
  }

  async searchIssues(query: string, options?: { teamId?: string; limit?: number }): Promise<IssueOutput[]> {
    const results = await this.client.searchIssues(query, {
      first: options?.limit || 20,
    });

    let issues = results.nodes;

    // Filter by team if specified
    if (options?.teamId) {
      const filtered = [];
      for (const issue of issues) {
        const team = await issue.team;
        if (team?.id === options.teamId) {
          filtered.push(issue);
        }
      }
      issues = filtered;
    }

    return this.mapIssuesToOutput(issues);
  }

  async createIssue(input: {
    title: string;
    teamId: string;
    description?: string;
    projectId?: string;
    cycleId?: string;
    assigneeId?: string;
    stateId?: string;
    priority?: number;
    labelIds?: string[];
    parentId?: string;
  }): Promise<IssueOutput> {
    const result = await this.client.createIssue({
      title: input.title,
      teamId: input.teamId,
      description: input.description,
      projectId: input.projectId,
      cycleId: input.cycleId,
      assigneeId: input.assigneeId,
      stateId: input.stateId,
      priority: input.priority,
      labelIds: input.labelIds,
      parentId: input.parentId,
    });

    const issue = await result.issue;
    if (!issue) throw new Error('Failed to create issue');

    const mapped = await this.mapIssuesToOutput([issue]);
    return mapped[0];
  }

  async updateIssue(
    id: string,
    input: {
      title?: string;
      description?: string;
      projectId?: string | null;
      cycleId?: string | null;
      assigneeId?: string | null;
      stateId?: string;
      priority?: number;
      labelIds?: string[];
    }
  ): Promise<IssueOutput> {
    const result = await this.client.updateIssue(id, input);

    const issue = await result.issue;
    if (!issue) throw new Error('Failed to update issue');

    const mapped = await this.mapIssuesToOutput([issue]);
    return mapped[0];
  }

  async addComment(issueId: string, body: string): Promise<{ id: string; body: string }> {
    const result = await this.client.createComment({
      issueId,
      body,
    });

    const comment = await result.comment;
    if (!comment) throw new Error('Failed to create comment');

    return { id: comment.id, body: comment.body };
  }

  // ============================================================================
  // Project Creation
  // ============================================================================

  async createProject(input: {
    name: string;
    teamIds: string[];
    description?: string;
    state?: string;
    targetDate?: string;
    startDate?: string;
  }): Promise<ProjectOutput> {
    const result = await this.client.createProject({
      name: input.name,
      teamIds: input.teamIds,
      description: input.description,
      state: input.state,
      targetDate: input.targetDate,
      startDate: input.startDate,
    });

    const project = await result.project;
    if (!project) throw new Error('Failed to create project');

    const teams = await project.teams();
    const lead = await project.lead;

    return {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      state: project.state,
      progress: project.progress,
      targetDate: project.targetDate || undefined,
      startDate: project.startDate || undefined,
      lead: lead ? { id: lead.id, name: lead.name } : undefined,
      teams: teams.nodes.map((t) => ({ id: t.id, name: t.name })),
      url: project.url,
    };
  }

  // ============================================================================
  // Workflow State Creation
  // ============================================================================

  async createWorkflowState(input: {
    name: string;
    teamId: string;
    type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
    color?: string;
    position?: number;
  }): Promise<CachedWorkflowState> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createInput: any = {
      name: input.name,
      teamId: input.teamId,
      type: input.type,
    };
    if (input.color) createInput.color = input.color;
    if (input.position !== undefined) createInput.position = input.position;

    const result = await this.client.createWorkflowState(createInput);

    const state = await result.workflowState;
    if (!state) throw new Error('Failed to create workflow state');

    return {
      id: state.id,
      name: state.name,
      type: state.type,
      color: state.color,
      position: state.position,
      teamId: input.teamId,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async mapIssuesToOutput(issues: any[]): Promise<IssueOutput[]> {
    const result: IssueOutput[] = [];

    for (const issue of issues) {
      try {
        const state = await issue.state;
        const assignee = await issue.assignee;
        const project = await issue.project;
        const cycle = await issue.cycle;

        // labels might be a function or a property depending on the SDK version
        let labels: Array<{ id: string; name: string }> = [];
        if (typeof issue.labels === 'function') {
          const labelsResult = await issue.labels();
          labels = labelsResult?.nodes?.map((l: { id: string; name: string }) => ({
            id: l.id,
            name: l.name
          })) || [];
        }

        result.push({
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description || undefined,
          state: state ? { id: state.id, name: state.name } : { id: '', name: 'Unknown' },
          assignee: assignee ? { id: assignee.id, name: assignee.name } : undefined,
          project: project ? { id: project.id, name: project.name } : undefined,
          cycle: cycle ? { id: cycle.id, name: cycle.name || undefined, number: cycle.number } : undefined,
          priority: issue.priority,
          priorityLabel: issue.priorityLabel,
          labels,
          createdAt: issue.createdAt instanceof Date ? issue.createdAt.toISOString() : String(issue.createdAt),
          updatedAt: issue.updatedAt instanceof Date ? issue.updatedAt.toISOString() : String(issue.updatedAt),
          url: issue.url,
        });
      } catch (err) {
        // Skip issues that fail to map
        console.error(`Failed to map issue ${issue.identifier}:`, err);
      }
    }

    return result;
  }

  // Resolve user by various inputs (id, email, "me")
  async resolveUserId(input: string): Promise<string | null> {
    if (input.toLowerCase() === 'me') {
      const me = await this.getMe();
      return me.id;
    }

    await this.ensureCacheReady();

    // Try by ID
    const byId = this.cache.getUserById(input);
    if (byId) return byId.id;

    // Try by email
    const byEmail = this.cache.getUserByEmail(input);
    if (byEmail) return byEmail.id;

    return null;
  }

  // Resolve team by key or id
  async resolveTeamId(input: string): Promise<string | null> {
    await this.ensureCacheReady();

    const byKey = this.cache.getTeamByKey(input);
    if (byKey) return byKey.id;

    const byId = this.cache.getTeamById(input);
    if (byId) return byId.id;

    return null;
  }

  // Resolve state by name for a team
  async resolveStateId(teamId: string, stateName: string): Promise<string | null> {
    await this.ensureCacheReady();

    const state = this.cache.getStateByName(teamId, stateName);
    return state?.id || null;
  }

  // Resolve multiple state names to IDs for a team
  async resolveStateIds(teamId: string, stateNames: string[]): Promise<string[]> {
    await this.ensureCacheReady();

    const ids: string[] = [];
    for (const name of stateNames) {
      const state = this.cache.getStateByName(teamId, name);
      if (state) {
        ids.push(state.id);
      }
    }
    return ids;
  }

  // Resolve label name to ID (for a team or globally)
  async resolveLabelId(labelName: string, teamId?: string): Promise<string | null> {
    await this.ensureCacheReady();

    const label = this.cache.getLabelByName(labelName, teamId);
    return label?.id || null;
  }

  // Get all available labels (for listing)
  getLabels(teamId?: string): CachedLabel[] {
    return this.cache.getLabels(teamId);
  }
}

// Factory function
export function createLinearClient(): LinearClient {
  return new LinearClient();
}
