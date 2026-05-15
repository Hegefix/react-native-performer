import { describe, it, expect, beforeEach } from '@jest/globals';
import { RenderTracker } from '../renderTracker';

describe('RenderTracker', () => {
  let tracker: RenderTracker;

  beforeEach(() => {
    tracker = new RenderTracker({ maxTracked: 5 });
  });

  it('returns 1 on first record for a fiber', () => {
    const fiber = {};
    expect(tracker.record(fiber, false)).toBe(1);
  });

  it('increments count on subsequent records', () => {
    const fiber = {};
    tracker.record(fiber, false);
    tracker.record(fiber, false);
    expect(tracker.record(fiber, false)).toBe(3);
  });

  it('tracks unnecessary rerenders separately', () => {
    const fiber = {};
    tracker.record(fiber, true);
    tracker.record(fiber, false);
    tracker.record(fiber, true);
    const stats = tracker.getStats(fiber);
    expect(stats?.renderCount).toBe(3);
    expect(stats?.unnecessaryCount).toBe(2);
  });

  it('returns undefined stats for untracked fiber', () => {
    expect(tracker.getStats({})).toBeUndefined();
  });

  it('respects maxTracked cap -- new non-problematic fibers rejected', () => {
    const fibers = Array.from({ length: 6 }, () => ({}));
    for (let i = 0; i < 5; i++) {
      tracker.record(fibers[i]!, false);
    }
    expect(tracker.record(fibers[5]!, false)).toBe(0);
    expect(tracker.getStats(fibers[5]!)).toBeUndefined();
  });

  it('allows fibers beyond cap if they have unnecessary rerenders', () => {
    const fibers = Array.from({ length: 6 }, () => ({}));
    for (let i = 0; i < 5; i++) {
      tracker.record(fibers[i]!, false);
    }
    expect(tracker.record(fibers[5]!, true)).toBe(1);
  });

  it('reset clears all tracking', () => {
    const fiber = {};
    tracker.record(fiber, false);
    tracker.reset();
    expect(tracker.getStats(fiber)).toBeUndefined();
    expect(tracker.record(fiber, false)).toBe(1);
  });

  it('uses default maxTracked of 1000 when not specified', () => {
    const defaultTracker = new RenderTracker();
    const fiber = {};
    expect(defaultTracker.record(fiber, false)).toBe(1);
  });
});
