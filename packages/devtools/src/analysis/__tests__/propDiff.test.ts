import { describe, it, expect } from '@jest/globals';
import { diffProps } from '../propDiff';

describe('diffProps', () => {
  it('returns empty array when props are identical references', () => {
    const props = { a: 1, b: 'hello' };
    expect(diffProps(props, props)).toEqual([]);
  });

  it('returns empty array when all values are shallow-equal', () => {
    const prev = { a: 1, b: 'hello', c: true };
    const next = { a: 1, b: 'hello', c: true };
    expect(diffProps(prev, next)).toEqual([]);
  });

  it('returns keys where values differ', () => {
    const prev = { a: 1, b: 'hello', c: true };
    const next = { a: 2, b: 'hello', c: false };
    expect(diffProps(prev, next)).toEqual(['a', 'c']);
  });

  it('detects new keys added', () => {
    const prev = { a: 1 };
    const next = { a: 1, b: 2 };
    expect(diffProps(prev, next)).toEqual(['b']);
  });

  it('detects removed keys', () => {
    const prev = { a: 1, b: 2 };
    const next = { a: 1 };
    expect(diffProps(prev, next)).toEqual(['b']);
  });

  it('detects inline function reference changes', () => {
    const prev = { onPress: () => {} };
    const next = { onPress: () => {} };
    expect(diffProps(prev, next)).toEqual(['onPress']);
  });

  it('detects inline object reference changes', () => {
    const style = { flex: 1 };
    const prev = { style };
    const next = { style: { flex: 1 } };
    expect(diffProps(prev, next)).toEqual(['style']);
  });

  it('returns empty array when both are null', () => {
    expect(diffProps(null, null)).toEqual([]);
  });

  it('returns empty array when both are undefined', () => {
    expect(diffProps(undefined, undefined)).toEqual([]);
  });

  it('returns all keys when prev is null and next has props', () => {
    expect(diffProps(null, { a: 1, b: 2 })).toEqual(['a', 'b']);
  });

  it('returns all keys when next is null and prev has props', () => {
    expect(diffProps({ a: 1, b: 2 }, null)).toEqual(['a', 'b']);
  });

  it('handles NaN correctly (NaN === NaN for prop comparison)', () => {
    const prev = { value: NaN };
    const next = { value: NaN };
    expect(diffProps(prev, next)).toEqual([]);
  });

  it('treats children prop like any other prop', () => {
    const prev = { children: 'hello' };
    const next = { children: 'world' };
    expect(diffProps(prev, next)).toEqual(['children']);
  });
});
