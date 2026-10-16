// Must stay the first import: the renderer binds to the devtools hook when its
// module is evaluated, so the hook has to exist before react-test-renderer loads.
import './support/fakeDevtoolsHook';

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  act,
  Component,
  createContext,
  createElement as h,
  forwardRef,
  memo,
  useContext,
  useState,
  type ReactElement,
} from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { attachHook } from '../attachHook';
import { onCommit, onRerender, __clearListenersForTests } from '../eventBus';
import type { AttachHandle, CommitEvent, RerenderEvent } from '../types';

/**
 * Integration tests against real React 19 fibers. Each scenario asserts the
 * CORRECT behaviour. Numbered comments name the root cause each scenario
 * pinned down before the detection fix (file:line refer to the pre-fix code).
 */

const TEST_RENDERER_DEPRECATION = 'react-test-renderer is deprecated';

let handle: AttachHandle;
let renderer: ReactTestRenderer | null;
let commits: CommitEvent[];
let rerenders: RerenderEvent[];
let unexpectedConsole: string[];

beforeEach(() => {
  commits = [];
  rerenders = [];
  unexpectedConsole = [];
  renderer = null;

  const captureConsole = (...args: unknown[]): void => {
    const message = String(args[0]);
    if (message.includes(TEST_RENDERER_DEPRECATION)) return;
    unexpectedConsole.push(message);
  };
  jest.spyOn(console, 'error').mockImplementation(captureConsole);
  jest.spyOn(console, 'warn').mockImplementation(captureConsole);

  handle = attachHook();
  onCommit(event => { commits.push(event); });
  onRerender(event => { rerenders.push(event); });
});

afterEach(async () => {
  const mounted = renderer;
  if (mounted) {
    await act(async () => { mounted.unmount(); });
  }
  handle.detach();
  __clearListenersForTests();
  jest.restoreAllMocks();
  // A walk that throws is swallowed by attachHook and only shows up as a warning.
  expect(unexpectedConsole).toEqual([]);
});

async function mount(element: ReactElement): Promise<void> {
  await act(async () => { renderer = create(element); });
}

async function update(trigger: () => void): Promise<CommitEvent> {
  const before = commits.length;
  await act(async () => { trigger(); });
  expect(commits.length).toBe(before + 1);
  const commit = commits[commits.length - 1];
  if (!commit) throw new Error('no commit observed');
  return commit;
}

function renderedNames(commit: CommitEvent): string[] {
  return commit.renderedFibers.map(fiber => fiber.name);
}

function rerendersIn(commit: CommitEvent): RerenderEvent[] {
  return rerenders.filter(event => event.commitId === commit.commitId);
}

function rerenderOf(commit: CommitEvent, name: string): RerenderEvent {
  const matches = rerendersIn(commit).filter(event => event.component.name === name);
  expect(matches).toHaveLength(1);
  const event = matches[0];
  if (!event) throw new Error(`no rerender event for ${name}`);
  return event;
}

/**
 * Builds a tree whose setters are captured per test, so components stay
 * plain function declarations with stable names.
 */
function makeCounter(name: string): {
  Counter: () => ReactElement;
  bump: () => void;
} {
  let setCount: ((next: (prev: number) => number) => void) | null = null;
  const Counter = (): ReactElement => {
    const [count, set] = useState(0);
    setCount = set;
    return h('view', null, String(count));
  };
  Object.defineProperty(Counter, 'name', { value: name });
  return {
    Counter,
    bump: () => {
      if (!setCount) throw new Error(`${name} not mounted`);
      setCount(prev => prev + 1);
    },
  };
}

function StaticLeaf(): ReactElement {
  return h('view');
}

function Static(): ReactElement {
  return h(StaticLeaf);
}

describe('attachHook against react-test-renderer (React 19)', () => {
  it('reports the initial mount of every component', async () => {
    const { Counter } = makeCounter('Counter');
    function App(): ReactElement {
      return h('view', null, h(Counter), h(Static));
    }

    await mount(h(App));

    expect(commits).toHaveLength(1);
    const [mountCommit] = commits;
    if (!mountCommit) throw new Error('no mount commit');
    for (const name of ['App', 'Counter', 'Static', 'StaticLeaf']) {
      expect(rerenderOf(mountCommit, name).reason).toEqual({ type: 'mount' });
    }
  });

  // 1. fiberWalk.ts:61-68 compares fiber vs alternate for every fiber in the
  // tree, including subtrees React bailed out of without cloning. After the
  // full App rerender, Static's children keep a stale alternate with
  // different props, so they are reported as rendered on every later commit.
  it('does not report a static sibling of an updating component', async () => {
    const counter = makeCounter('Counter');
    let rerenderApp: (() => void) | null = null;
    function App(): ReactElement {
      const [, setTick] = useState(0);
      rerenderApp = () => setTick(prev => prev + 1);
      return h('view', null, h(counter.Counter), h(Static));
    }

    await mount(h(App));
    await update(() => rerenderApp?.());

    for (let i = 0; i < 2; i++) {
      const commit = await update(counter.bump);
      expect(renderedNames(commit)).toContain('Counter');
      expect(renderedNames(commit)).not.toContain('Static');
      expect(renderedNames(commit)).not.toContain('StaticLeaf');
      expect(rerendersIn(commit).map(event => event.component.name)).toEqual(['Counter']);
    }
  });

  // 2. fiberWalk.ts:61-63: a fiber React never cloned has no alternate, so
  // `!fiber.alternate` reports it as a mount on every commit.
  it('does not report a never-updating component as mount on later commits', async () => {
    const counter = makeCounter('Counter');
    function App(): ReactElement {
      return h('view', null, h(counter.Counter), h(Static));
    }

    await mount(h(App));

    for (let i = 0; i < 2; i++) {
      const commit = await update(counter.bump);
      expect(commit.renderedFibers.filter(fiber => fiber.isMount)).toEqual([]);
      expect(rerendersIn(commit).filter(event => event.reason.type === 'mount')).toEqual([]);
    }
  });

  // 3. Same root cause as 1: the memo bailout skips MemoLeaf, but its fiber
  // still differs from its stale alternate.
  it('does not report a memo component that bailed out, nor its subtree', async () => {
    function MemoLeaf({ label }: { label: string }): ReactElement {
      return h('view', null, label);
    }
    const MemoChild = memo(function MemoChild({ label }: { label: string }): ReactElement {
      return h(MemoLeaf, { label });
    });
    let bumpParent: (() => void) | null = null;
    function Parent(): ReactElement {
      const [count, setCount] = useState(0);
      bumpParent = () => setCount(prev => prev + 1);
      return h('view', null, String(count), h(MemoChild, { label: 'fixed' }));
    }

    await mount(h(Parent));

    for (let i = 0; i < 2; i++) {
      const commit = await update(() => bumpParent?.());
      expect(renderedNames(commit)).toContain('Parent');
      expect(renderedNames(commit)).not.toContain('MemoChild');
      expect(renderedNames(commit)).not.toContain('MemoLeaf');
      expect(rerendersIn(commit).map(event => event.component.name)).toEqual(['Parent']);
    }
  });

  // 4. categorize.ts:29-31 + propDiff.ts:25: props are compared by reference,
  // so a fresh-but-equal inline object is reported as `props-changed`.
  it('reports an inline-object prop from a rerendering parent as parent-rerender', async () => {
    function StyledChild({ style }: { style: { flex: number } }): ReactElement {
      return h('view', { style });
    }
    let bumpParent: (() => void) | null = null;
    function Parent(): ReactElement {
      const [count, setCount] = useState(0);
      bumpParent = () => setCount(prev => prev + 1);
      return h('view', null, String(count), h(StyledChild, { style: { flex: 1 } }));
    }

    await mount(h(Parent));
    const commit = await update(() => bumpParent?.());

    const event = rerenderOf(commit, 'StyledChild');
    expect(event.reason).toEqual({ type: 'parent-rerender', referenceOnlyKeys: ['style'] });
    expect(event.isUnnecessary).toBe(true);
  });

  // 4b. categorize.ts:36,42: React clones the hook list on every render, so
  // memoizedState is always a new reference for a component with hooks, even
  // when no hook's state changed. Kept separate from 4 so each root cause
  // flips its own test.
  it('reports a parent-driven rerender of a component with untouched state as parent-rerender', async () => {
    function HookedChild(): ReactElement {
      const [value] = useState('constant');
      return h('view', null, value);
    }
    let bumpParent: (() => void) | null = null;
    function Parent(): ReactElement {
      const [count, setCount] = useState(0);
      bumpParent = () => setCount(prev => prev + 1);
      return h('view', null, String(count), h(HookedChild));
    }

    await mount(h(Parent));
    const commit = await update(() => bumpParent?.());

    const event = rerenderOf(commit, 'HookedChild');
    expect(event.reason).toEqual({ type: 'parent-rerender' });
    expect(event.isUnnecessary).toBe(true);
  });

  // 5.
  it('reports a useState update as state-changed', async () => {
    const counter = makeCounter('Counter');
    function App(): ReactElement {
      return h('view', null, h(counter.Counter));
    }

    await mount(h(App));
    const commit = await update(counter.bump);

    const event = rerenderOf(commit, 'Counter');
    expect(event.reason).toEqual({ type: 'state-changed' });
    expect(event.isUnnecessary).toBe(false);
  });

  // 6. fiberWalk.ts:61-68 misses this render entirely: a context-only render
  // keeps memoizedProps (cloned from current) and memoizedState (null, since
  // useContext adds no hook), so the reference heuristic sees no change.
  it('reports a context value change as context-changed with the provider name', async () => {
    const ThemeContext = createContext('light');
    ThemeContext.displayName = 'ThemeContext';
    function ThemedLeaf(): ReactElement {
      return h('view', null, useContext(ThemeContext));
    }
    // memo isolates ThemedLeaf from the provider's own rerender, so only the
    // context propagation can schedule it.
    const Shell = memo(function Shell(): ReactElement {
      return h(ThemedLeaf);
    });
    let toggleTheme: (() => void) | null = null;
    function ThemeRoot(): ReactElement {
      const [theme, setTheme] = useState('light');
      toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
      return h(ThemeContext.Provider, { value: theme }, h(Shell));
    }

    await mount(h(ThemeRoot));
    const commit = await update(() => toggleTheme?.());

    const event = rerenderOf(commit, 'ThemedLeaf');
    expect(event.reason).toEqual({ type: 'context-changed', provider: 'ThemeContext' });
    expect(event.isUnnecessary).toBe(false);
  });

  // 6b. React 19 has no forceUpdate fiber flag (bit 20 is Forked); a class
  // that rendered with unchanged props, state and context can only have been
  // forced past shouldComponentUpdate.
  it('reports a class forceUpdate as force-update and a class setState as state-changed', async () => {
    let instance: Clock | null = null;
    class Clock extends Component<Record<string, never>, { ticks: number }> {
      override state = { ticks: 0 };
      override componentDidMount(): void { instance = this; }
      override render(): ReactElement { return h('view', null, String(this.state.ticks)); }
    }

    await mount(h('view', null, h(Clock)));
    const forced = await update(() => instance?.forceUpdate());
    expect(rerenderOf(forced, 'Clock').reason).toEqual({ type: 'force-update' });

    const ticked = await update(() => instance?.setState(prev => ({ ticks: prev.ticks + 1 })));
    expect(rerenderOf(ticked, 'Clock').reason).toEqual({ type: 'state-changed' });
  });

  // 7. fiberWalk.ts:76-77: for memo(forwardRef(X)) the memo fiber's
  // `type.type` is the forwardRef object, which has no name; its `render`
  // holds X one level deeper.
  it('names memo(forwardRef(X)) as X, not Anonymous', async () => {
    const Wrapped = memo(
      forwardRef<unknown, { label: string }>(function X({ label }, ref): ReactElement {
        return h('view', { ref }, label);
      }),
    );
    function App(): ReactElement {
      return h(Wrapped, { label: 'hello' });
    }

    await mount(h(App));

    const [mountCommit] = commits;
    if (!mountCommit) throw new Error('no mount commit');
    expect(renderedNames(mountCommit)).toContain('X');
    expect(renderedNames(mountCommit)).not.toContain('Anonymous');
    expect(rerendersIn(mountCommit).map(event => event.component.name)).not.toContain('Anonymous');
  });

  // 8. renderTracker.ts:19 keys stats by fiber object, but React alternates
  // between two fiber objects per component, so counts split across them.
  // The mount is render #1, so after N updates the count is N + 1.
  it('counts every render of a component across commits', async () => {
    const UPDATES = 4;
    const counter = makeCounter('Counter');
    function App(): ReactElement {
      return h('view', null, h(counter.Counter));
    }

    await mount(h(App));
    for (let i = 0; i < UPDATES; i++) {
      await update(counter.bump);
    }

    const counts = rerenders
      .filter(event => event.component.name === 'Counter')
      .map(event => event.renderCount);
    expect(counts).toEqual([1, 2, 3, 4, 5]);
    expect(counts[counts.length - 1]).toBe(UPDATES + 1);
  });
});
