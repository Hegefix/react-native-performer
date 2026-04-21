import type { AttachHandle, AttachOptions, CommitEvent } from './types';
import { emitCommit } from './eventBus';
import { walkFiberTree } from './fiberWalk';

const PATCH_MARKER = '__rnPerformerPatched__';
const MAX_RENDERED_SAMPLE = 500;

type DevToolsHook = {
  onCommitFiberRoot?:
    | ((
        rendererID: number,
        root: any,
        priorityLevel: unknown,
        didError: boolean,
      ) => void)
    | undefined;
  renderers?: Map<number, unknown> | undefined;
  [PATCH_MARKER]?: boolean | undefined;
};

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
        '[react-native-performer] __REACT_DEVTOOLS_GLOBAL_HOOK__ not found. ' +
          'Attach must happen before React renders. Import at app entry.',
      );
    }
    return { attached: false, detach: noop };
  }

  if (hook[PATCH_MARKER]) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[react-native-performer] hook already patched, skipping duplicate attach.',
      );
    }
    return { attached: false, detach: noop };
  }

  const originalOnCommit = hook.onCommitFiberRoot;
  let commitCount = 0;
  const skipHostComponents = options.skipHostComponents ?? false;

  hook.onCommitFiberRoot = (rendererId, root, priorityLevel, didError) => {
    commitCount++;

    try {
      const walk = walkFiberTree(root.current, {
        skipHostComponents,
        maxRenderedSample: MAX_RENDERED_SAMPLE,
      });

      const event: CommitEvent = {
        commitId: commitCount,
        timestamp:
          typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now(),
        rendererId,
        totalFibers: walk.total,
        renderedFibers: walk.rendered,
      };

      emitCommit(event);
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[react-native-performer] fiber walk failed:', err);
      }
    }

    if (typeof originalOnCommit === 'function') {
      try {
        originalOnCommit(rendererId, root, priorityLevel, didError);
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[react-native-performer] upstream onCommit threw:', err);
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
