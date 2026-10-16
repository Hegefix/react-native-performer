type FiberStats = {
  renderCount: number;
  unnecessaryCount: number;
};

/** The two fiber objects React alternates between for one component instance. */
type TrackedFiber = {
  alternate?: object | null;
};

/**
 * Per-component render counts. React swaps a component between two fiber
 * objects (current and alternate) on every update, so the entry is stored
 * under both: whichever one the next commit hands us finds it. WeakMap keys
 * free the entry when React drops the fibers, so no size cap is needed.
 */
export class RenderTracker {
  private stats = new WeakMap<object, FiberStats>();

  record(fiber: TrackedFiber, isUnnecessary: boolean): number {
    const alternate = fiber.alternate ?? null;
    const entry = this.stats.get(fiber) ??
      (alternate ? this.stats.get(alternate) : undefined) ?? { renderCount: 0, unnecessaryCount: 0 };

    entry.renderCount++;
    if (isUnnecessary) entry.unnecessaryCount++;

    this.stats.set(fiber, entry);
    if (alternate) this.stats.set(alternate, entry);
    return entry.renderCount;
  }

  getStats(fiber: TrackedFiber): FiberStats | undefined {
    const alternate = fiber.alternate ?? null;
    return this.stats.get(fiber) ?? (alternate ? this.stats.get(alternate) : undefined);
  }

  reset(): void {
    this.stats = new WeakMap();
  }
}
