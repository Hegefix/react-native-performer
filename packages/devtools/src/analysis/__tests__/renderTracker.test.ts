import { describe, it, expect, beforeEach } from '@jest/globals';
import { RenderTracker } from '../renderTracker';

describe('RenderTracker', () => {
  let tracker: RenderTracker;

  beforeEach(() => {
    tracker = new RenderTracker();
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

  it('keeps one count across the current/alternate fiber pair', () => {
    const current: { alternate: object | null } = { alternate: null };
    expect(tracker.record(current, false)).toBe(1);
    const workInProgress = { alternate: current };
    current.alternate = workInProgress;
    expect(tracker.record(workInProgress, false)).toBe(2);
    expect(tracker.record(current, true)).toBe(3);
    expect(tracker.getStats(workInProgress)).toEqual({ renderCount: 3, unnecessaryCount: 1 });
  });

  it('reset clears all tracking', () => {
    const fiber = {};
    tracker.record(fiber, false);
    tracker.reset();
    expect(tracker.getStats(fiber)).toBeUndefined();
    expect(tracker.record(fiber, false)).toBe(1);
  });
});
