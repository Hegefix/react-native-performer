import { describe, it, expect } from '@jest/globals';
import { createContext, forwardRef, lazy, memo, type ReactElement } from 'react';
import { getFiberName } from '../fiberWalk';
import { FiberTag, type Fiber } from '../fiber';

function fiberOf(type: unknown, tag: number = FiberTag.FunctionComponent): Fiber {
  return {
    tag,
    type,
    flags: 0,
    child: null,
    sibling: null,
    alternate: null,
    memoizedProps: null,
    memoizedState: null,
    dependencies: null,
  };
}

function X(): ReactElement | null {
  return null;
}

describe('getFiberName', () => {
  it('names host components, functions and missing types', () => {
    expect(getFiberName(fiberOf('View', FiberTag.HostComponent))).toBe('View');
    expect(getFiberName(fiberOf(X))).toBe('X');
    expect(getFiberName(fiberOf(null, FiberTag.HostRoot))).toBe('Unknown');
    expect(getFiberName(fiberOf(() => null))).toBe('Anonymous');
  });

  it('unwraps memo, forwardRef and memo(forwardRef(X)) to X', () => {
    expect(getFiberName(fiberOf(memo(X), FiberTag.MemoComponent))).toBe('X');
    expect(getFiberName(fiberOf(forwardRef(X), FiberTag.ForwardRef))).toBe('X');
    expect(getFiberName(fiberOf(memo(forwardRef(X)), FiberTag.MemoComponent))).toBe('X');
  });

  it('prefers a displayName set on a wrapper', () => {
    const Wrapped = memo(X);
    Wrapped.displayName = 'FancyX';
    expect(getFiberName(fiberOf(Wrapped, FiberTag.MemoComponent))).toBe('FancyX');
  });

  it('names React 19 context Provider and Consumer fibers after the context', () => {
    const ThemeContext = createContext('light');
    ThemeContext.displayName = 'ThemeContext';
    expect(getFiberName(fiberOf(ThemeContext, FiberTag.ContextProvider))).toBe('ThemeContext.Provider');
    expect(getFiberName(fiberOf(ThemeContext.Consumer, FiberTag.ContextConsumer))).toBe('ThemeContext.Consumer');
    expect(getFiberName(fiberOf(createContext(0), FiberTag.ContextProvider))).toBe('Context.Provider');
  });

  it('names an unresolved lazy type Lazy', () => {
    expect(getFiberName(fiberOf(lazy(async () => ({ default: X })), 16))).toBe('Lazy');
  });
});
