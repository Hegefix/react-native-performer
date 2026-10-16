// Must stay the first import: the renderer binds to the devtools hook when its
// module is evaluated, so the hook has to exist before react-test-renderer loads.
import { fakeHook } from '../../core/__tests__/support/fakeDevtoolsHook';

import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import { act, createElement as h, useState } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { attachHook } from '../../core/attachHook';
import { onCommit, onRerender, __clearListenersForTests } from '../../core/eventBus';
import { PerformerRoot } from '../PerformerRoot';
import { enableOverlay, disableOverlay } from '../../overlay/overlayApi';
import { showHUD, hideHUD } from '../../hud/HUDRoot';
import { FLUSH_INTERVAL_MS } from '../../overlay/OverlayContainer';
import type { AttachHandle, CommitEvent, RerenderEvent } from '../../core/types';

// react-test-renderer host instances have no native measure API; give every component a rect
// so flashes really mount and their commits go through the hook.
jest.mock('../../overlay/measure', () => ({
  measureFiber: () => Promise.resolve({ x: 0, y: 0, width: 10, height: 10 }),
}));

const TEST_RENDERER_DEPRECATION = 'react-test-renderer is deprecated';
const HUD_UPDATE_INTERVAL_MS = 500;
const LIBRARY_COMPONENTS = [
  'PerformerRoot',
  'PerformerLayer',
  'OverlayHost',
  'OverlayContainer',
  'FlashRect',
  'HUDApp',
  'HUDContainer',
  'DraggablePill',
];

let handle: AttachHandle;
let renderer: ReactTestRenderer | null;
let commits: CommitEvent[];
let rerenders: RerenderEvent[];
let unexpectedConsole: string[];
let reactCommits: number;
let bumpCounter: () => void = () => {};

function Counter() {
  const [count, setCount] = useState(0);
  bumpCounter = () => setCount(c => c + 1);
  return h('Text', null, String(count));
}

function wait(ms: number): Promise<void> {
  return act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
}

function flashCount(): number {
  return renderer?.root.findAll(node => typeof node.props.flash === 'object').length ?? 0;
}

beforeAll(() => {
  globalThis.requestAnimationFrame = callback => Number(setTimeout(() => callback(Date.now()), 0));
  globalThis.cancelAnimationFrame = frame => clearTimeout(frame);
});

beforeEach(async () => {
  commits = [];
  rerenders = [];
  unexpectedConsole = [];

  const captureConsole = (...args: unknown[]): void => {
    const message = String(args[0]);
    if (message.includes(TEST_RENDERER_DEPRECATION)) return;
    unexpectedConsole.push(message);
  };
  jest.spyOn(console, 'error').mockImplementation(captureConsole);
  jest.spyOn(console, 'warn').mockImplementation(captureConsole);

  // Counts every commit React makes, including the ones attachHook skips; attachHook must still forward them.
  reactCommits = 0;
  fakeHook.onCommitFiberRoot = () => { reactCommits++; };
  handle = attachHook();
  onCommit(event => { commits.push(event); });
  onRerender(event => { rerenders.push(event); });
  enableOverlay();
  showHUD({ updateInterval: HUD_UPDATE_INTERVAL_MS });

  await act(async () => { renderer = create(h(PerformerRoot, null, h(Counter))); });
});

afterEach(async () => {
  const mounted = renderer;
  if (mounted) await act(async () => { mounted.unmount(); });
  renderer = null;
  handle.detach();
  __clearListenersForTests();
  jest.restoreAllMocks();
  expect(unexpectedConsole).toEqual([]);
});

function reportedNames(): string[] {
  return [
    ...commits.flatMap(commit => commit.renderedFibers.map(fiber => fiber.name)),
    ...rerenders.map(event => event.component.name),
  ];
}

describe('self-filtering', () => {
  it('reports the app on mount, not the overlay or HUD', () => {
    expect(reportedNames()).toContain('Counter');
    expect(reportedNames().filter(name => LIBRARY_COMPONENTS.includes(name))).toEqual([]);
  });

  it('flash and HUD commits after an app render are not reported at all', async () => {
    commits = [];
    rerenders = [];
    const reactCommitsBefore = reactCommits;

    await act(async () => { bumpCounter(); });
    await wait(FLUSH_INTERVAL_MS + 50);
    expect(flashCount()).toBe(1);
    await wait(HUD_UPDATE_INTERVAL_MS);

    // React committed the app render, the flash and the HUD refresh; only the first is the app's.
    expect(reactCommits - reactCommitsBefore).toBeGreaterThanOrEqual(3);
    expect(commits).toHaveLength(1);
    expect(reportedNames().filter(name => LIBRARY_COMPONENTS.includes(name))).toEqual([]);
    expect(rerenders.map(event => event.component.name)).toEqual(['Counter']);
  });

  it('toggling the overlay and HUD emits no commit and no rerender', async () => {
    commits = [];
    rerenders = [];
    const reactCommitsBefore = reactCommits;

    await act(async () => { hideHUD(); });
    await act(async () => { showHUD(); });
    await act(async () => { disableOverlay(); });
    await act(async () => { enableOverlay(); });

    expect(reactCommits - reactCommitsBefore).toBeGreaterThanOrEqual(4);
    expect(commits).toEqual([]);
    expect(rerenders).toEqual([]);
  });

  it('keeps commit ids contiguous across skipped commits', async () => {
    const lastId = commits[commits.length - 1]?.commitId ?? 0;
    await act(async () => { hideHUD(); });
    await act(async () => { bumpCounter(); });

    expect(commits[commits.length - 1]?.commitId).toBe(lastId + 1);
  });
});
