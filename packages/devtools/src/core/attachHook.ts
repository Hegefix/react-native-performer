import type { AttachHandle, AttachOptions, CommitEvent, FilterConfig } from './types';
import { emitCommit, emitRerender } from './eventBus';
import { walkFiberTree } from './fiberWalk';
import { categorizeRender } from '../analysis/categorize';
import { RenderTracker } from '../analysis/renderTracker';
import { shouldInclude, DEFAULT_FILTER } from '../analysis/filter';

const PATCH_MARKER = '__performerDevtoolsPatched__';
const MAX_RENDERED_SAMPLE = 500;

type DevToolsHook = {
  onCommitFiberRoot?:
    | ((rendererID: number, root: any, priorityLevel: unknown, didError: boolean) => void)
    | undefined;
  renderers?: Map<number, unknown> | undefined;
  [key: string]: unknown;
};

let activeFilter: FilterConfig = { ...DEFAULT_FILTER };
let activeTracker: RenderTracker | null = null;

export function setFilter(filter: FilterConfig): void {
  activeFilter = { ...DEFAULT_FILTER, ...filter };
}

export function attachHook(options: AttachOptions = {}): AttachHandle {
  if (!__DEV__) {
    return { attached: false, detach: noop };
  }

  const hook = (globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ as
    | DevToolsHook
    | undefined;

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
  activeTracker = new RenderTracker();

  hook.onCommitFiberRoot = (rendererId, root, priorityLevel, didError) => {
    commitCount++;

    try {
      const walk = walkFiberTree(root.current, {
        skipHostComponents,
        maxRenderedSample: MAX_RENDERED_SAMPLE,
      });

      const commitEvent: CommitEvent = {
        commitId: commitCount,
        timestamp:
          typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now(),
        rendererId,
        totalFibers: walk.total,
        renderedFibers: walk.rendered.map(({ name, isMount, propsKeys }) => ({
          name, isMount, propsKeys,
        })),
      };

      emitCommit(commitEvent);

      for (const fiberInfo of walk.rendered) {
        const reason = categorizeRender(fiberInfo.fiber);
        const isUnnecessary = reason.type === 'parent-rerender';
        const renderCount = activeTracker!.record(fiberInfo.fiber, isUnnecessary);

        if (renderCount === 0) continue;

        const rerenderEvent = {
          commitId: commitCount,
          timestamp: commitEvent.timestamp,
          component: {
            name: fiberInfo.name,
            fiberTag: fiberInfo.fiber.tag ?? 0,
            depth: fiberInfo.depth,
          },
          reason,
          renderCount,
          isUnnecessary,
        };

        if (shouldInclude(rerenderEvent, activeFilter)) {
          emitRerender(rerenderEvent);
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
    activeTracker = null;
  };

  return { attached: true, detach };
}

function noop(): void {}
