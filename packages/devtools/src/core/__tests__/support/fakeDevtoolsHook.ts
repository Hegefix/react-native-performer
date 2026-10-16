/**
 * Installs a minimal `__REACT_DEVTOOLS_GLOBAL_HOOK__` on import.
 *
 * The reconciler reads the hook exactly once, when the renderer module is
 * evaluated (`injectInternals` at module init). It must therefore be imported
 * BEFORE `react-test-renderer`, or React never calls `onCommitFiberRoot`.
 */

type RendererInternals = Record<string, unknown>;

export type FakeDevtoolsHook = {
  supportsFiber: true;
  renderers: Map<number, RendererInternals>;
  inject: (internals: RendererInternals) => number;
  onCommitFiberRoot: (
    rendererID: number,
    root: unknown,
    priorityLevel: unknown,
    didError: boolean,
  ) => void;
  onCommitFiberUnmount: (rendererID: number, fiber: unknown) => void;
  checkDCE: () => void;
  [key: string]: unknown;
};

declare global {
  // eslint-disable-next-line no-var
  var __REACT_DEVTOOLS_GLOBAL_HOOK__: FakeDevtoolsHook | undefined;
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let nextRendererId = 1;

export const fakeHook: FakeDevtoolsHook = {
  supportsFiber: true,
  renderers: new Map(),
  inject(internals) {
    const id = nextRendererId++;
    this.renderers.set(id, internals);
    return id;
  },
  onCommitFiberRoot() {},
  onCommitFiberUnmount() {},
  checkDCE() {},
};

globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = fakeHook;
// Lets `act()` flush concurrent-root work synchronously without warnings.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
