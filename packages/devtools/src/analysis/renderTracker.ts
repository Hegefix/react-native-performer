type FiberStats = {
  renderCount: number;
  unnecessaryCount: number;
};

type TrackerOptions = {
  maxTracked?: number;
};

export class RenderTracker {
  private stats = new WeakMap<object, FiberStats>();
  private trackedCount = 0;
  private readonly maxTracked: number;

  constructor(options: TrackerOptions = {}) {
    this.maxTracked = options.maxTracked ?? 1000;
  }

  record(fiber: object, isUnnecessary: boolean): number {
    const existing = this.stats.get(fiber);

    if (existing) {
      existing.renderCount++;
      if (isUnnecessary) existing.unnecessaryCount++;
      return existing.renderCount;
    }

    if (this.trackedCount >= this.maxTracked && !isUnnecessary) {
      return 0;
    }

    const entry: FiberStats = {
      renderCount: 1,
      unnecessaryCount: isUnnecessary ? 1 : 0,
    };
    this.stats.set(fiber, entry);
    this.trackedCount++;
    return 1;
  }

  getStats(fiber: object): FiberStats | undefined {
    return this.stats.get(fiber);
  }

  reset(): void {
    this.trackedCount = 0;
    this.stats = new WeakMap();
  }
}
