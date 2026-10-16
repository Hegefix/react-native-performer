import '../../core/__tests__/support/fakeDevtoolsHook';

import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import { act, createElement as h } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { OverlayContainer, FLUSH_INTERVAL_MS, MAX_FLASHES_PER_FLUSH } from '../OverlayContainer';
import { emitRerender, __clearListenersForTests } from '../../core/eventBus';
import { FiberTag, type Fiber } from '../../core/fiber';
import type { OverlayOptions, RerenderEvent } from '../../core/types';
import type { FlashData } from '../types';

jest.mock('../measure', () => ({
  measureFiber: () => Promise.resolve({ x: 40, y: 60, width: 10, height: 10 }),
}));

const TEST_RENDERER_DEPRECATION = 'react-test-renderer is deprecated';
const OPTIONS: Required<OverlayOptions> = {
  colorScale: 'default',
  minSeverity: 'all',
  showUnnecessaryOnly: false,
  opacity: 0.3,
  enabled: true,
};

let renderer: ReactTestRenderer | null = null;

function fakeFiber(): Fiber {
  return {
    tag: FiberTag.FunctionComponent,
    type: function Component() {},
    flags: 0,
    child: null,
    sibling: null,
    alternate: null,
    memoizedProps: {},
    memoizedState: null,
    dependencies: null,
  };
}

function rerender(commitId: number, renderCount = 1): RerenderEvent {
  return {
    commitId,
    timestamp: 0,
    component: { name: 'Component', fiberTag: FiberTag.FunctionComponent, depth: 1 },
    reason: { type: 'state-changed' },
    renderCount,
    isUnnecessary: false,
  };
}

function flashes(): FlashData[] {
  return renderer?.root.findAll(node => typeof node.props.flash === 'object').map(node => node.props.flash) ?? [];
}

function wait(ms: number): Promise<void> {
  return act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
}

beforeAll(() => {
  globalThis.requestAnimationFrame = callback => Number(setTimeout(() => callback(Date.now()), 0));
  globalThis.cancelAnimationFrame = frame => clearTimeout(frame);
});

beforeEach(async () => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (!String(args[0]).includes(TEST_RENDERER_DEPRECATION)) throw new Error(String(args[0]));
  });
  await act(async () => { renderer = create(h(OverlayContainer, { options: OPTIONS })); });
});

afterEach(async () => {
  const mounted = renderer;
  if (mounted) await act(async () => { mounted.unmount(); });
  renderer = null;
  __clearListenersForTests();
  jest.restoreAllMocks();
});

describe('OverlayContainer batching', () => {
  it('flashes every commit that lands before the flush', async () => {
    emitRerender(rerender(1), fakeFiber());
    emitRerender(rerender(2), fakeFiber());
    emitRerender(rerender(3), fakeFiber());
    await wait(FLUSH_INTERVAL_MS);

    expect(flashes()).toHaveLength(3);
  });

  it('flashes a component once per flush, with its latest render count', async () => {
    const fiber = fakeFiber();
    emitRerender(rerender(1, 1), fiber);
    emitRerender(rerender(2, 2), fiber);
    await wait(FLUSH_INTERVAL_MS);

    expect(flashes().map(flash => flash.renderCount)).toEqual([2]);
  });

  it('treats the alternate fiber as the same component', async () => {
    const current = fakeFiber();
    const alternate = { ...fakeFiber(), alternate: current };
    current.alternate = alternate;
    emitRerender(rerender(1, 1), current);
    emitRerender(rerender(2, 2), alternate);
    await wait(FLUSH_INTERVAL_MS);

    expect(flashes().map(flash => flash.renderCount)).toEqual([2]);
  });

  it('caps a single flush', async () => {
    for (let i = 0; i < MAX_FLASHES_PER_FLUSH + 10; i++) emitRerender(rerender(i), fakeFiber());
    await wait(FLUSH_INTERVAL_MS);

    expect(flashes()).toHaveLength(MAX_FLASHES_PER_FLUSH);
  });

  it('ignores events without a fiber (public emit path)', async () => {
    emitRerender(rerender(1));
    await wait(FLUSH_INTERVAL_MS);

    expect(flashes()).toHaveLength(0);
  });

  it('uses the measured window rect for the flash', async () => {
    emitRerender(rerender(1), fakeFiber());
    await wait(FLUSH_INTERVAL_MS);

    expect(flashes()[0]?.rect).toEqual({ x: 40, y: 60, width: 10, height: 10 });
  });
});
