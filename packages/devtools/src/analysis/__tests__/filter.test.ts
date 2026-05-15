import { describe, it, expect } from '@jest/globals';
import { shouldInclude, DEFAULT_FILTER } from '../filter';
import type { RerenderEvent } from '../../core/types';

function makeEvent(overrides: Partial<RerenderEvent> = {}): RerenderEvent {
  return {
    commitId: 1,
    timestamp: 0,
    component: { name: 'Button', fiberTag: 0, depth: 3 },
    reason: { type: 'props-changed', keys: ['onPress'] },
    renderCount: 1,
    isUnnecessary: false,
    ...overrides,
  };
}

describe('shouldInclude', () => {
  it('includes event when no filter is set', () => {
    expect(shouldInclude(makeEvent(), {})).toBe(true);
  });

  it('excludes event by ignoreComponents', () => {
    const event = makeEvent({ component: { name: 'NavigationContainer', fiberTag: 0, depth: 0 } });
    expect(shouldInclude(event, { ignoreComponents: ['NavigationContainer'] })).toBe(false);
  });

  it('excludes event by ignorePatterns', () => {
    const event = makeEvent({ component: { name: 'RCTView', fiberTag: 0, depth: 0 } });
    expect(shouldInclude(event, { ignorePatterns: [/^RCT/] })).toBe(false);
  });

  it('excludes host components when ignoreHostComponents is true', () => {
    const event = makeEvent({ component: { name: 'View', fiberTag: 5, depth: 0 } });
    expect(shouldInclude(event, { ignoreHostComponents: true })).toBe(false);
  });

  it('includes host components when ignoreHostComponents is false', () => {
    const event = makeEvent({ component: { name: 'View', fiberTag: 5, depth: 0 } });
    expect(shouldInclude(event, { ignoreHostComponents: false })).toBe(true);
  });

  it('filters to only unnecessary rerenders', () => {
    const necessary = makeEvent({ isUnnecessary: false });
    const unnecessary = makeEvent({ isUnnecessary: true });
    expect(shouldInclude(necessary, { onlyUnnecessary: true })).toBe(false);
    expect(shouldInclude(unnecessary, { onlyUnnecessary: true })).toBe(true);
  });

  it('excludes events below minRenderCount', () => {
    const event = makeEvent({ renderCount: 2 });
    expect(shouldInclude(event, { minRenderCount: 3 })).toBe(false);
    expect(shouldInclude(event, { minRenderCount: 2 })).toBe(true);
  });

  it('excludes events beyond maxDepth', () => {
    const event = makeEvent({ component: { name: 'Deep', fiberTag: 0, depth: 15 } });
    expect(shouldInclude(event, { maxDepth: 10 })).toBe(false);
    expect(shouldInclude(event, { maxDepth: 15 })).toBe(true);
  });

  it('applies multiple filters together', () => {
    const event = makeEvent({
      component: { name: 'Button', fiberTag: 0, depth: 3 },
      renderCount: 1,
      isUnnecessary: false,
    });
    expect(shouldInclude(event, { onlyUnnecessary: true, minRenderCount: 5 })).toBe(false);
  });
});

describe('DEFAULT_FILTER', () => {
  it('ignores common framework components', () => {
    expect(DEFAULT_FILTER.ignoreComponents).toContain('NavigationContainer');
    expect(DEFAULT_FILTER.ignoreComponents).toContain('GestureHandlerRootView');
    expect(DEFAULT_FILTER.ignoreComponents).toContain('SafeAreaProvider');
  });

  it('ignores RCT-prefixed host components', () => {
    expect(DEFAULT_FILTER.ignorePatterns?.some(p => p.test('RCTView'))).toBe(true);
  });

  it('ignores host components by default', () => {
    expect(DEFAULT_FILTER.ignoreHostComponents).toBe(true);
  });
});
