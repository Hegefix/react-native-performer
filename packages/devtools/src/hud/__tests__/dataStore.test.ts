import { describe, it, expect, beforeEach } from '@jest/globals';
import { HUDDataStore } from '../dataStore';
import type { RerenderEvent } from '../../core/types';

function makeEvent(overrides: Partial<RerenderEvent> = {}): RerenderEvent {
  return {
    commitId: 1,
    timestamp: 1000,
    component: { name: 'Button', fiberTag: 0, depth: 3 },
    reason: { type: 'props-changed', keys: ['onPress'] },
    renderCount: 1,
    isUnnecessary: false,
    ...overrides,
  };
}

describe('HUDDataStore', () => {
  let store: HUDDataStore;

  beforeEach(() => {
    store = new HUDDataStore({ maxCommits: 5 });
  });

  it('records events and returns component stats', () => {
    store.record(makeEvent({ component: { name: 'Button', fiberTag: 0, depth: 0 } }));
    store.record(makeEvent({ component: { name: 'Button', fiberTag: 0, depth: 0 }, commitId: 2 }));
    const stats = store.getTopOffenders(10);
    expect(stats).toHaveLength(1);
    expect(stats[0]!.renderCount).toBe(2);
  });

  it('ranks offenders by render count descending', () => {
    store.record(makeEvent({ component: { name: 'A', fiberTag: 0, depth: 0 } }));
    store.record(makeEvent({ component: { name: 'B', fiberTag: 0, depth: 0 } }));
    store.record(makeEvent({ component: { name: 'B', fiberTag: 0, depth: 0 }, commitId: 2 }));
    const stats = store.getTopOffenders(10);
    expect(stats[0]!.name).toBe('B');
  });

  it('tracks unnecessary rerender percentage', () => {
    store.record(makeEvent({ isUnnecessary: false }));
    store.record(makeEvent({ isUnnecessary: true, commitId: 2 }));
    store.record(makeEvent({ isUnnecessary: true, commitId: 3 }));
    const summary = store.getSummary();
    expect(summary.totalRerenders).toBe(3);
    expect(summary.unnecessaryPercentage).toBeCloseTo(66.67, 0);
  });

  it('builds commit timeline', () => {
    store.record(makeEvent({ commitId: 1 }));
    store.record(makeEvent({ commitId: 1, component: { name: 'Text', fiberTag: 0, depth: 0 } }));
    store.record(makeEvent({ commitId: 2, component: { name: 'View', fiberTag: 0, depth: 0 } }));
    const timeline = store.getTimeline();
    expect(timeline).toHaveLength(2);
    expect(timeline[0]!.totalRendered).toBe(2);
    expect(timeline[1]!.totalRendered).toBe(1);
  });

  it('evicts oldest commits beyond maxCommits', () => {
    for (let i = 1; i <= 7; i++) {
      store.record(makeEvent({ commitId: i }));
    }
    const timeline = store.getTimeline();
    expect(timeline).toHaveLength(5);
    expect(timeline[0]!.commitId).toBe(3);
  });

  it('returns render history for a specific component', () => {
    store.record(makeEvent({ commitId: 1, reason: { type: 'mount' } }));
    store.record(makeEvent({ commitId: 2, reason: { type: 'props-changed', keys: ['style'] } }));
    const history = store.getComponentHistory('Button');
    expect(history).toHaveLength(2);
    expect(history[0]!.reason.type).toBe('mount');
    expect(history[1]!.reason.type).toBe('props-changed');
  });

  it('reset clears all data', () => {
    store.record(makeEvent());
    store.reset();
    expect(store.getTopOffenders(10)).toHaveLength(0);
    expect(store.getTimeline()).toHaveLength(0);
    expect(store.getSummary().totalRerenders).toBe(0);
  });
});
