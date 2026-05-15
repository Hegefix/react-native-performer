import type { RenderReason } from '../core/types';

export type ComponentStats = {
  name: string;
  renderCount: number;
  unnecessaryCount: number;
  lastReason: RenderReason;
  lastTimestamp: number;
};

export type CommitSummary = {
  commitId: number;
  timestamp: number;
  totalRendered: number;
  unnecessaryCount: number;
  components: Array<{
    name: string;
    reason: RenderReason;
    isUnnecessary: boolean;
  }>;
};
