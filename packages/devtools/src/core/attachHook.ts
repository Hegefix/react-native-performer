import type { AttachHandle, AttachOptions, CommitEvent, FilterConfig } from './types';
import { emitCommit, emitRerender } from './eventBus';
import { walkFiberTree } from './fiberWalk';
import type { FiberRoot } from './fiber';
import { categorizeRender } from '../analysis/categorize';
import { RenderTracker } from '../analysis/renderTracker';
import { shouldInclude, DEFAULT_FILTER } from '../analysis/filter';

const PATCH_MARKER = '__performerDevtoolsPatched__';
const MAX_RENDERED_SAMPLE = 500;

type CommitFiberRootHandler = (
  rendererID: number,
  root: FiberRoot,
  priorityLevel: unknown,
  didError: boolean,
) => void;

type DevToolsHook = {
  onCommitFiberRoot?: CommitFiberRootHandler | undefined;
  renderers?: Map<number, unknown> | undefined;
  [key: string]: unknown;
};

let activeFilter: FilterConfig = { ...DEFAULT_FILTER };

export function setFilter(filter: FilterConfig): void {
  activeFilter = { ...DEFAULT_FILTER, ...filter };
}

export function attachHook(options: AttachOptions = {}): AttachHandle {
  if (!__DEV__) {
    return { attached: false, detach: noop };
  }

  const hook = readDevToolsHook();

  if (!hook) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[@performer/devtools] __REACT_DEVTOOLS_GLOBAL_HOOK__ not found. ' +
          'Attach must happen before React renders. Import at app entry.',
      );
    }
    return { attached: false, detach: noop };
  }

  if (hook[PATCH_MARKER]) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[@performer/devtools] hook already patched, skipping duplicate attach.');
    }
    return { attached: false, detach: noop };
  }

  const originalOnCommit = hook.onCommitFiberRoot;
  let commitCount = 0;
  const skipHostComponents = options.skipHostComponents ?? false;
  const tracker = new RenderTracker();

  hook.onCommitFiberRoot = (rendererId, root, priorityLevel, didError) => {
    commitCount++;

    try {
      const walk = walkFiberTree(root.current, { skipHostComponents });

      const commitEvent: CommitEvent = {
        commitId: commitCount,
        timestamp: readTimestamp(),
        rendererId,
        totalFibers: walk.total,
        renderedFibers: walk.rendered
          .slice(0, MAX_RENDERED_SAMPLE)
          .map(({ name, isMount, propsKeys }) => ({ name, isMount, propsKeys })),
      };

      emitCommit(commitEvent);

      for (const fiberInfo of walk.rendered) {
        const reason = categorizeRender(fiberInfo.fiber);
        const isUnnecessary = reason.type === 'parent-rerender';
        const renderCount = tracker.record(fiberInfo.fiber, isUnnecessary);

        const rerenderEvent = {
          commitId: commitCount,
          timestamp: commitEvent.timestamp,
          component: {
            name: fiberInfo.name,
            fiberTag: fiberInfo.fiber.tag,
            depth: fiberInfo.depth,
          },
          reason,
          renderCount,
          isUnnecessary,
        };

        if (shouldInclude(rerenderEvent, activeFilter, fiberInfo.fiber)) {
          emitRerender(rerenderEvent, fiberInfo.fiber);
        }
      }
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[@performer/devtools] fiber walk failed:', err);
      }
    }

    if (typeof originalOnCommit === 'function') {
      try {
        originalOnCommit(rendererId, root, priorityLevel, didError);
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[@performer/devtools] upstream onCommit threw:', err);
        }
      }
    }
  };

  hook[PATCH_MARKER] = true;

  const detach = (): void => {
    if (!hook[PATCH_MARKER]) return;
    hook.onCommitFiberRoot = originalOnCommit;
    delete hook[PATCH_MARKER];
  };

  return { attached: true, detach };
}

function noop(): void {}

function readDevToolsHook(): DevToolsHook | undefined {
  const candidate: unknown = Reflect.get(globalThis, '__REACT_DEVTOOLS_GLOBAL_HOOK__');
  return isDevToolsHook(candidate) ? candidate : undefined;
}

// The hook is installed by React DevTools / RN before React loads; beyond
// being an object its shape is React's contract, and every method we call on
// it is checked with typeof at the call site.
function isDevToolsHook(value: unknown): value is DevToolsHook {
  return typeof value === 'object' && value !== null;
}

/**
 * `performance` is only typed under the DOM lib, which RN consumers don't
 * load, so it is read off globalThis untyped. Hermes and JSC both provide it.
 */
function readTimestamp(): number {
  const clock: unknown = Reflect.get(globalThis, 'performance');
  if (typeof clock === 'object' && clock !== null && 'now' in clock && typeof clock.now === 'function') {
    const timestamp: unknown = Reflect.apply(clock.now, clock, []);
    if (typeof timestamp === 'number') return timestamp;
  }
  return Date.now();
}
