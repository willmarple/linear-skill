import { readFileSync, writeFileSync, existsSync } from 'fs';
import { PATHS, getConfigManager } from '../config/index.js';
import {
  CacheStore,
  CacheData,
  CachedTeam,
  CachedUser,
  CachedWorkflowState,
  CachedProject,
  CachedLabel,
} from '../types/index.js';

const CACHE_VERSION = 1;

function createEmptyCache(ttlMinutes: number): CacheStore {
  return {
    version: CACHE_VERSION,
    lastRefresh: new Date().toISOString(),
    ttlMinutes,
    data: {
      teams: [],
      users: [],
      states: {},
      projects: [],
      labels: [],
    },
  };
}

export class CacheManager {
  private cache: CacheStore;
  private ttlMinutes: number;

  constructor() {
    const config = getConfigManager();
    this.ttlMinutes = config.getPreferences().cacheTtlMinutes;
    this.cache = this.loadCache();
  }

  private loadCache(): CacheStore {
    if (!existsSync(PATHS.cache)) {
      return createEmptyCache(this.ttlMinutes);
    }

    try {
      const raw = readFileSync(PATHS.cache, 'utf-8');
      const parsed = JSON.parse(raw) as CacheStore;

      // Check version compatibility
      if (parsed.version !== CACHE_VERSION) {
        return createEmptyCache(this.ttlMinutes);
      }

      return parsed;
    } catch {
      return createEmptyCache(this.ttlMinutes);
    }
  }

  private saveCache(): void {
    writeFileSync(PATHS.cache, JSON.stringify(this.cache, null, 2));
  }

  isExpired(): boolean {
    const lastRefresh = new Date(this.cache.lastRefresh);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastRefresh.getTime()) / (1000 * 60);
    return diffMinutes > this.ttlMinutes;
  }

  isEmpty(): boolean {
    return this.cache.data.teams.length === 0;
  }

  needsRefresh(): boolean {
    return this.isEmpty() || this.isExpired();
  }

  // Getters
  getTeams(): CachedTeam[] {
    return this.cache.data.teams;
  }

  getTeamByKey(key: string): CachedTeam | undefined {
    return this.cache.data.teams.find(
      (t) => t.key.toLowerCase() === key.toLowerCase()
    );
  }

  getTeamById(id: string): CachedTeam | undefined {
    return this.cache.data.teams.find((t) => t.id === id);
  }

  getUsers(): CachedUser[] {
    return this.cache.data.users;
  }

  getUserByEmail(email: string): CachedUser | undefined {
    return this.cache.data.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
  }

  getUserById(id: string): CachedUser | undefined {
    return this.cache.data.users.find((u) => u.id === id);
  }

  getStatesForTeam(teamId: string): CachedWorkflowState[] {
    return this.cache.data.states[teamId] || [];
  }

  getStateByName(teamId: string, name: string): CachedWorkflowState | undefined {
    const states = this.getStatesForTeam(teamId);
    return states.find((s) => s.name.toLowerCase() === name.toLowerCase());
  }

  getProjects(): CachedProject[] {
    return this.cache.data.projects;
  }

  getProjectById(id: string): CachedProject | undefined {
    return this.cache.data.projects.find((p) => p.id === id);
  }

  getLabels(teamId?: string): CachedLabel[] {
    if (!teamId) {
      return this.cache.data.labels;
    }
    return this.cache.data.labels.filter(
      (l) => l.teamId === teamId || !l.teamId
    );
  }

  getLabelByName(name: string, teamId?: string): CachedLabel | undefined {
    return this.cache.data.labels.find(
      (l) =>
        l.name.toLowerCase() === name.toLowerCase() &&
        (!teamId || l.teamId === teamId || !l.teamId)
    );
  }

  // Setters (for refreshing cache)
  setTeams(teams: CachedTeam[]): void {
    this.cache.data.teams = teams;
    this.touch();
  }

  setUsers(users: CachedUser[]): void {
    this.cache.data.users = users;
    this.touch();
  }

  setStatesForTeam(teamId: string, states: CachedWorkflowState[]): void {
    this.cache.data.states[teamId] = states;
    this.touch();
  }

  setProjects(projects: CachedProject[]): void {
    this.cache.data.projects = projects;
    this.touch();
  }

  setLabels(labels: CachedLabel[]): void {
    this.cache.data.labels = labels;
    this.touch();
  }

  // Update timestamp and save
  private touch(): void {
    this.cache.lastRefresh = new Date().toISOString();
    this.saveCache();
  }

  // Full refresh
  setAll(data: CacheData): void {
    this.cache.data = data;
    this.touch();
  }

  // Clear cache
  clear(): void {
    this.cache = createEmptyCache(this.ttlMinutes);
    this.saveCache();
  }

  // Get cache status
  getStatus(): {
    lastRefresh: string;
    isExpired: boolean;
    isEmpty: boolean;
    counts: {
      teams: number;
      users: number;
      projects: number;
      labels: number;
    };
  } {
    return {
      lastRefresh: this.cache.lastRefresh,
      isExpired: this.isExpired(),
      isEmpty: this.isEmpty(),
      counts: {
        teams: this.cache.data.teams.length,
        users: this.cache.data.users.length,
        projects: this.cache.data.projects.length,
        labels: this.cache.data.labels.length,
      },
    };
  }
}

// Singleton instance
let cacheManager: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}

export function resetCacheManager(): void {
  cacheManager = null;
}
