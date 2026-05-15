import { describe, it, expect } from '@jest/globals';
import type {
  RenderReason,
  RerenderEvent,
  FilterConfig,
  RerenderListener,
  OverlayOptions,
  HUDOptions,
} from '../types';

describe('type definitions', () => {
  it('RenderReason discriminated union covers all cases', () => {
    const reasons: RenderReason[] = [
      { type: 'mount' },
      { type: 'props-changed', keys: ['onPress', 'style'] },
      { type: 'state-changed' },
      { type: 'parent-rerender' },
      { type: 'context-changed', provider: 'ThemeContext' },
      { type: 'force-update' },
    ];
    expect(reasons).toHaveLength(6);
    expect(reasons.map(r => r.type)).toEqual([
      'mount', 'props-changed', 'state-changed',
      'parent-rerender', 'context-changed', 'force-update',
    ]);
  });

  it('RerenderEvent has required fields', () => {
    const event: RerenderEvent = {
      commitId: 1,
      timestamp: 100.5,
      component: { name: 'Button', fiberTag: 0, depth: 3 },
      reason: { type: 'props-changed', keys: ['onPress'] },
      renderCount: 5,
      isUnnecessary: false,
    };
    expect(event.component.name).toBe('Button');
    expect(event.isUnnecessary).toBe(false);
  });

  it('FilterConfig supports all filter options', () => {
    const filter: FilterConfig = {
      ignoreComponents: ['NavigationContainer'],
      ignorePatterns: [/^RCT/],
      ignoreHostComponents: true,
      onlyUnnecessary: false,
      minRenderCount: 2,
      maxDepth: 10,
    };
    expect(filter.ignoreComponents).toContain('NavigationContainer');
  });

  it('RerenderListener signature accepts RerenderEvent', () => {
    const events: RerenderEvent[] = [];
    const listener: RerenderListener = (event) => {
      events.push(event);
    };
    listener({
      commitId: 1,
      timestamp: 0,
      component: { name: 'Test', fiberTag: 0, depth: 0 },
      reason: { type: 'mount' },
      renderCount: 1,
      isUnnecessary: false,
    });
    expect(events).toHaveLength(1);
  });
});
