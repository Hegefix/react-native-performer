import type { RerenderEvent, RenderReason } from '../core/types';
import type { ComponentStats, CommitSummary } from './types';

type StoreOptions = {
  maxCommits?: number;
};

type ComponentHistoryEntry = {
  commitId: number;
  timestamp: number;
  reason: RenderReason;
  isUnnecessary: boolean;
};

export class HUDDataStore {
  private readonly maxCommits: number;
  private commits: CommitSummary[] = [];
  private componentStats = new Map<string, ComponentStats>();
  private componentHistory = new Map<string, ComponentHistoryEntry[]>();
  private totalRerenders = 0;
  private totalUnnecessary = 0;

  constructor(options: StoreOptions = {}) {
    this.maxCommits = options.maxCommits ?? 1000;
  }

  record(event: RerenderEvent): void {
    this.totalRerenders++;
    if (event.isUnnecessary) this.totalUnnecessary++;

    this.updateComponentStats(event);
    this.updateTimeline(event);
    this.updateHistory(event);
    this.evictOldCommits();
  }

  getTopOffenders(limit: number): ComponentStats[] {
    return Array.from(this.componentStats.values())
      .sort((a, b) => b.renderCount - a.renderCount)
      .slice(0, limit);
  }

  getTimeline(): CommitSummary[] {
    return this.commits;
  }

  getComponentHistory(name: string): ComponentHistoryEntry[] {
    return this.componentHistory.get(name) ?? [];
  }

  getSummary(): { totalRerenders: number; unnecessaryPercentage: number } {
    return {
      totalRerenders: this.totalRerenders,
      unnecessaryPercentage:
        this.totalRerenders === 0
          ? 0
          : (this.totalUnnecessary / this.totalRerenders) * 100,
    };
  }

  reset(): void {
    this.commits = [];
    this.componentStats.clear();
    this.componentHistory.clear();
    this.totalRerenders = 0;
    this.totalUnnecessary = 0;
  }

  private updateComponentStats(event: RerenderEvent): void {
    const existing = this.componentStats.get(event.component.name);
    if (existing) {
      existing.renderCount++;
      if (event.isUnnecessary) existing.unnecessaryCount++;
      existing.lastReason = event.reason;
      existing.lastTimestamp = event.timestamp;
    } else {
      this.componentStats.set(event.component.name, {
        name: event.component.name,
        renderCount: 1,
        unnecessaryCount: event.isUnnecessary ? 1 : 0,
        lastReason: event.reason,
        lastTimestamp: event.timestamp,
      });
    }
  }

  private updateTimeline(event: RerenderEvent): void {
    let commit = this.commits.find(c => c.commitId === event.commitId);
    if (!commit) {
      commit = {
        commitId: event.commitId,
        timestamp: event.timestamp,
        totalRendered: 0,
        unnecessaryCount: 0,
        components: [],
      };
      this.commits.push(commit);
    }
    commit.totalRendered++;
    if (event.isUnnecessary) commit.unnecessaryCount++;
    commit.components.push({
      name: event.component.name,
      reason: event.reason,
      isUnnecessary: event.isUnnecessary,
    });
  }

  private updateHistory(event: RerenderEvent): void {
    const name = event.component.name;
    if (!this.componentHistory.has(name)) {
      this.componentHistory.set(name, []);
    }
    this.componentHistory.get(name)!.push({
      commitId: event.commitId,
      timestamp: event.timestamp,
      reason: event.reason,
      isUnnecessary: event.isUnnecessary,
    });
  }

  private evictOldCommits(): void {
    while (this.commits.length > this.maxCommits) {
      this.commits.shift();
    }
  }
}
