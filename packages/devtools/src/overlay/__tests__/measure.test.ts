import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { findHostFiber, measureFiber, MEASURE_TIMEOUT_MS } from '../measure';
import { FiberTag, type Fiber } from '../../core/fiber';

type TestFiber = Fiber & { stateNode?: unknown };
type MeasureCallback = (x: number, y: number, width: number, height: number) => void;

function fiber(tag: number, children: TestFiber[] = [], stateNode?: unknown): TestFiber {
  const node: TestFiber = {
    tag,
    type: tag === FiberTag.HostComponent ? 'View' : function Component() {},
    flags: 0,
    child: null,
    sibling: null,
    alternate: null,
    memoizedProps: {},
    memoizedState: null,
    dependencies: null,
    stateNode,
  };
  node.child = children[0] ?? null;
  children.forEach((child, i) => { child.sibling = children[i + 1] ?? null; });
  return node;
}

function measurable(rect: [number, number, number, number]) {
  return {
    measureInWindow: jest.fn((callback: MeasureCallback) => callback(...rect)),
  };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'nativeFabricUIManager');
  jest.useRealTimers();
});

describe('findHostFiber', () => {
  it('returns the first host descendant in document order', () => {
    const first = fiber(FiberTag.HostComponent);
    const second = fiber(FiberTag.HostComponent);
    const root = fiber(FiberTag.FunctionComponent, [
      fiber(FiberTag.FunctionComponent, [first]),
      second,
    ]);
    expect(findHostFiber(root)).toBe(first);
  });

  it('returns the fiber itself when it is a host fiber', () => {
    const host = fiber(FiberTag.HostComponent);
    expect(findHostFiber(host)).toBe(host);
  });

  it('returns null when nothing below renders a host view', () => {
    expect(findHostFiber(fiber(FiberTag.FunctionComponent, [fiber(FiberTag.FunctionComponent)]))).toBeNull();
  });
});

describe('measureFiber', () => {
  it('Fabric: measures through canonical.publicInstance', async () => {
    const publicInstance = measurable([10, 20, 30, 40]);
    const host = fiber(FiberTag.HostComponent, [], { node: {}, canonical: { publicInstance } });
    await expect(measureFiber(fiber(FiberTag.FunctionComponent, [host]))).resolves.toEqual({
      x: 10, y: 20, width: 30, height: 40,
    });
    expect(publicInstance.measureInWindow).toHaveBeenCalledTimes(1);
  });

  it('Fabric without a public instance yet: measures the shadow node via the UI manager', async () => {
    const shadowNode = {};
    const uiMeasure = jest.fn((_node: unknown, callback: MeasureCallback) => callback(1, 2, 3, 4));
    Reflect.set(globalThis, 'nativeFabricUIManager', { measureInWindow: uiMeasure });
    const host = fiber(FiberTag.HostComponent, [], { node: shadowNode, canonical: { publicInstance: null } });

    await expect(measureFiber(host)).resolves.toEqual({ x: 1, y: 2, width: 3, height: 4 });
    expect(uiMeasure.mock.calls[0]?.[0]).toBe(shadowNode);
  });

  it('Paper: measures the host stateNode itself', async () => {
    const host = fiber(FiberTag.HostComponent, [], measurable([5, 6, 7, 8]));
    await expect(measureFiber(fiber(FiberTag.ClassComponent, [host]))).resolves.toEqual({
      x: 5, y: 6, width: 7, height: 8,
    });
  });

  it('resolves null for a zero-size view', async () => {
    const host = fiber(FiberTag.HostComponent, [], measurable([5, 6, 0, 0]));
    await expect(measureFiber(host)).resolves.toBeNull();
  });

  it('resolves null when the stateNode has no measure API', async () => {
    await expect(measureFiber(fiber(FiberTag.HostComponent, [], { canonical: {} }))).resolves.toBeNull();
    await expect(measureFiber(fiber(FiberTag.HostComponent, [], {}))).resolves.toBeNull();
    await expect(measureFiber(fiber(FiberTag.HostComponent))).resolves.toBeNull();
  });

  it('resolves null when native throws', async () => {
    const stateNode = { measureInWindow: () => { throw new Error('view gone'); } };
    await expect(measureFiber(fiber(FiberTag.HostComponent, [], stateNode))).resolves.toBeNull();
  });

  it('resolves null when native never calls back', async () => {
    jest.useFakeTimers();
    const result = measureFiber(fiber(FiberTag.HostComponent, [], { measureInWindow: () => {} }));
    jest.advanceTimersByTime(MEASURE_TIMEOUT_MS);
    await expect(result).resolves.toBeNull();
  });
});
