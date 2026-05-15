import { describe, it, expect } from '@jest/globals';
import { categorizeRender } from '../categorize';
import type { RenderReason } from '../../core/types';

function makeFiber(overrides: Record<string, unknown> = {}) {
  return {
    type: function Button() {},
    tag: 0,
    memoizedProps: { a: 1 },
    memoizedState: null,
    alternate: null,
    dependencies: null,
    flags: 0,
    ...overrides,
  };
}

describe('categorizeRender', () => {
  it('returns mount when fiber has no alternate', () => {
    const fiber = makeFiber({ alternate: null });
    const result = categorizeRender(fiber);
    expect(result).toEqual({ type: 'mount' });
  });

  it('returns props-changed when prop values differ', () => {
    const fiber = makeFiber({
      memoizedProps: { a: 1, b: 2 },
      alternate: {
        memoizedProps: { a: 1, b: 999 },
        memoizedState: null,
        dependencies: null,
        flags: 0,
      },
    });
    const result = categorizeRender(fiber);
    expect(result).toEqual({ type: 'props-changed', keys: ['b'] });
  });

  it('returns parent-rerender when props reference changed but values identical', () => {
    const fiber = makeFiber({
      memoizedProps: { a: 1, b: 'hello' },
      alternate: {
        memoizedProps: { a: 1, b: 'hello' },
        memoizedState: null,
        dependencies: null,
        flags: 0,
      },
    });
    const result = categorizeRender(fiber);
    expect(result).toEqual({ type: 'parent-rerender' });
  });

  it('returns state-changed when memoizedState differs', () => {
    const prevState = { count: 0 };
    const nextState = { count: 1 };
    const fiber = makeFiber({
      memoizedProps: { a: 1 },
      memoizedState: nextState,
      alternate: {
        memoizedProps: { a: 1 },
        memoizedState: prevState,
        dependencies: null,
        flags: 0,
      },
    });
    const result = categorizeRender(fiber);
    expect(result).toEqual({ type: 'state-changed' });
  });

  it('returns context-changed when fiber has changed dependencies', () => {
    const prevContextValue = { theme: 'light' };
    const nextContextValue = { theme: 'dark' };
    const fiber = makeFiber({
      memoizedProps: { a: 1 },
      memoizedState: null,
      dependencies: {
        firstContext: {
          context: { displayName: 'ThemeContext' },
          memoizedValue: nextContextValue,
          next: null,
        },
      },
      alternate: {
        memoizedProps: { a: 1 },
        memoizedState: null,
        dependencies: {
          firstContext: {
            context: { displayName: 'ThemeContext' },
            memoizedValue: prevContextValue,
            next: null,
          },
        },
        flags: 0,
      },
    });
    const result = categorizeRender(fiber);
    expect(result).toEqual({ type: 'context-changed', provider: 'ThemeContext' });
  });

  it('returns force-update when ForceUpdateForLegacySuspense flag is set', () => {
    const FORCE_UPDATE = 0b0000000100000000000000000000;
    const fiber = makeFiber({
      memoizedProps: { a: 1 },
      memoizedState: null,
      flags: FORCE_UPDATE,
      alternate: {
        memoizedProps: { a: 1 },
        memoizedState: null,
        dependencies: null,
        flags: 0,
      },
    });
    const result = categorizeRender(fiber);
    expect(result).toEqual({ type: 'force-update' });
  });

  it('prioritizes props-changed over state-changed when both differ', () => {
    const fiber = makeFiber({
      memoizedProps: { a: 2 },
      memoizedState: { count: 1 },
      alternate: {
        memoizedProps: { a: 1 },
        memoizedState: { count: 0 },
        dependencies: null,
        flags: 0,
      },
    });
    const result = categorizeRender(fiber);
    expect(result.type).toBe('props-changed');
  });
});
