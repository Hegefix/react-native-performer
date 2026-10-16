import { describe, it, expect } from '@jest/globals';
import { categorizeRender } from '../categorize';
import { FiberTag, type ContextDependency, type Fiber, type Hook } from '../../core/fiber';

function makeFiber(overrides: Partial<Fiber> = {}): Fiber {
  return {
    type: function Button() {},
    tag: FiberTag.FunctionComponent,
    flags: 0,
    child: null,
    sibling: null,
    alternate: null,
    memoizedProps: { a: 1 },
    memoizedState: null,
    dependencies: null,
    ...overrides,
  };
}

function makeHooks(...hooks: Array<{ state: unknown; hasQueue: boolean }>): Hook | null {
  let next: Hook | null = null;
  for (let i = hooks.length - 1; i >= 0; i--) {
    const hook = hooks[i];
    if (!hook) continue;
    next = { memoizedState: hook.state, queue: hook.hasQueue ? {} : null, next };
  }
  return next;
}

function themeDependency(value: unknown): ContextDependency {
  return { context: { displayName: 'ThemeContext' }, memoizedValue: value, next: null };
}

describe('categorizeRender', () => {
  it('returns mount when fiber has no alternate', () => {
    const fiber = makeFiber({ alternate: null });
    expect(categorizeRender(fiber)).toEqual({ type: 'mount' });
  });

  it('returns props-changed when prop values differ', () => {
    const fiber = makeFiber({
      memoizedProps: { a: 1, b: 2 },
      alternate: makeFiber({ memoizedProps: { a: 1, b: 999 } }),
    });
    expect(categorizeRender(fiber)).toEqual({ type: 'props-changed', keys: ['b'] });
  });

  it('returns parent-rerender when props reference changed but values identical', () => {
    const fiber = makeFiber({
      memoizedProps: { a: 1, b: 'hello' },
      alternate: makeFiber({ memoizedProps: { a: 1, b: 'hello' } }),
    });
    expect(categorizeRender(fiber)).toEqual({ type: 'parent-rerender' });
  });

  it('names the props that changed by reference only on parent-rerender', () => {
    const fiber = makeFiber({
      memoizedProps: { style: { flex: 1 } },
      alternate: makeFiber({ memoizedProps: { style: { flex: 1 } } }),
    });
    expect(categorizeRender(fiber)).toEqual({
      type: 'parent-rerender',
      referenceOnlyKeys: ['style'],
    });
  });

  it('returns state-changed when a stateful hook changed', () => {
    const props = { a: 1 };
    const fiber = makeFiber({
      memoizedProps: props,
      memoizedState: makeHooks({ state: 1, hasQueue: true }),
      alternate: makeFiber({
        memoizedProps: props,
        memoizedState: makeHooks({ state: 0, hasQueue: true }),
      }),
    });
    expect(categorizeRender(fiber)).toEqual({ type: 'state-changed' });
  });

  it('ignores a cloned hook list whose stateful hooks kept their values', () => {
    const fiber = makeFiber({
      memoizedProps: { a: 1 },
      memoizedState: makeHooks({ state: 'same', hasQueue: true }, { state: {}, hasQueue: false }),
      alternate: makeFiber({
        memoizedProps: { a: 1 },
        memoizedState: makeHooks({ state: 'same', hasQueue: true }, { state: {}, hasQueue: false }),
      }),
    });
    expect(categorizeRender(fiber)).toEqual({ type: 'parent-rerender' });
  });

  it('returns state-changed when a class component state object changed', () => {
    const props = { a: 1 };
    const fiber = makeFiber({
      tag: FiberTag.ClassComponent,
      memoizedProps: props,
      memoizedState: { count: 1 },
      alternate: makeFiber({
        tag: FiberTag.ClassComponent,
        memoizedProps: props,
        memoizedState: { count: 0 },
      }),
    });
    expect(categorizeRender(fiber)).toEqual({ type: 'state-changed' });
  });

  it('returns context-changed when fiber has changed dependencies', () => {
    const fiber = makeFiber({
      dependencies: { firstContext: themeDependency({ theme: 'dark' }) },
      alternate: makeFiber({
        dependencies: { firstContext: themeDependency({ theme: 'light' }) },
      }),
    });
    expect(categorizeRender(fiber)).toEqual({ type: 'context-changed', provider: 'ThemeContext' });
  });

  it('returns force-update for a class that rendered with the same props, state and context', () => {
    const props = { a: 1 };
    const state = { count: 0 };
    const fiber = makeFiber({
      tag: FiberTag.ClassComponent,
      memoizedProps: props,
      memoizedState: state,
      alternate: makeFiber({
        tag: FiberTag.ClassComponent,
        memoizedProps: props,
        memoizedState: state,
      }),
    });
    expect(categorizeRender(fiber)).toEqual({ type: 'force-update' });
  });

  it('ignores the React 19 Forked flag (bit 20, the old FORCE_UPDATE_FLAG)', () => {
    const fiber = makeFiber({
      flags: 0b0000000100000000000000000000,
      memoizedProps: { a: 1 },
      alternate: makeFiber({ memoizedProps: { a: 1 } }),
    });
    expect(categorizeRender(fiber)).toEqual({ type: 'parent-rerender' });
  });

  it('prioritizes props-changed over state-changed when both differ', () => {
    const fiber = makeFiber({
      memoizedProps: { a: 2 },
      memoizedState: makeHooks({ state: 1, hasQueue: true }),
      alternate: makeFiber({
        memoizedProps: { a: 1 },
        memoizedState: makeHooks({ state: 0, hasQueue: true }),
      }),
    });
    expect(categorizeRender(fiber).type).toBe('props-changed');
  });
});
