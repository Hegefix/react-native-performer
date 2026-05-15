import { describe, it, expect } from '@jest/globals';
import { detectContextChange } from '../contextDetect';

type ContextDep = {
  context: { displayName?: string };
  memoizedValue: unknown;
  next: ContextDep | null;
};

function makeContextDep(
  displayName: string,
  value: unknown,
  next: ContextDep | null = null,
): ContextDep {
  return {
    context: { displayName },
    memoizedValue: value,
    next,
  };
}

describe('detectContextChange', () => {
  it('returns null when fiber has no dependencies', () => {
    expect(detectContextChange(null, null)).toBeNull();
  });

  it('returns null when dependencies have not changed', () => {
    const value = { theme: 'light' };
    const dep = makeContextDep('ThemeContext', value);
    expect(detectContextChange(dep, dep)).toBeNull();
  });

  it('returns provider name when context value reference changed', () => {
    const prevDep = makeContextDep('ThemeContext', { theme: 'light' });
    const nextDep = makeContextDep('ThemeContext', { theme: 'dark' });
    expect(detectContextChange(nextDep, prevDep)).toBe('ThemeContext');
  });

  it('returns first changed context when multiple contexts consumed', () => {
    const sharedTheme = { theme: 'light' };
    const prevSecond = makeContextDep('AuthContext', { user: 'a' });
    const nextSecond = makeContextDep('AuthContext', { user: 'b' });
    const prevFirst = makeContextDep('ThemeContext', sharedTheme, prevSecond);
    const nextFirst = makeContextDep('ThemeContext', sharedTheme, nextSecond);
    expect(detectContextChange(nextFirst, prevFirst)).toBe('AuthContext');
  });

  it('returns provider name when prev dependencies are null (new consumer)', () => {
    const nextDep = makeContextDep('ThemeContext', { theme: 'dark' });
    expect(detectContextChange(nextDep, null)).toBe('ThemeContext');
  });

  it('falls back to UnknownContext when displayName is missing', () => {
    const prevDep = { context: {}, memoizedValue: 'a', next: null };
    const nextDep = { context: {}, memoizedValue: 'b', next: null };
    expect(detectContextChange(nextDep, prevDep)).toBe('UnknownContext');
  });
});
