import { FiberTag, type Fiber } from '../core/fiber';
import type { MeasuredRect } from './types';

type MeasureCallback = (x: number, y: number, width: number, height: number) => void;
type MeasureInWindow = (callback: MeasureCallback) => void;
type HostFiber = Fiber & { stateNode?: unknown };
type FabricUIManager = { measureInWindow: (node: unknown, callback: MeasureCallback) => void };

const HOST_TAGS: ReadonlySet<number> = new Set([
  FiberTag.HostComponent,
  FiberTag.HostHoistable,
  FiberTag.HostSingleton,
]);

/** Paper never calls back for a view that unmounted before the measure ran. */
export const MEASURE_TIMEOUT_MS = 250;

/**
 * Component fibers have no native view of their own, so a component is
 * measured through the first host fiber below it, in document order.
 */
export function findHostFiber(fiber: Fiber): HostFiber | null {
  const stack: Fiber[] = [fiber];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (HOST_TAGS.has(node.tag)) return node;

    const children: Fiber[] = [];
    for (let child = node.child; child; child = child.sibling) children.push(child);
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child) stack.push(child);
    }
  }
  return null;
}

export function resolveMeasureInWindow(stateNode: unknown): MeasureInWindow | null {
  if (!isRecord(stateNode)) return null;

  // Fabric: a host stateNode is { node, canonical }; the public instance carries the measure API.
  const canonical = stateNode.canonical;
  if (isRecord(canonical)) {
    const publicInstance = canonical.publicInstance;
    if (hasMeasureInWindow(publicInstance)) {
      return callback => publicInstance.measureInWindow(callback);
    }
    // Newer renderers create the public instance lazily; the UI manager measures the shadow node directly.
    const uiManager = readFabricUIManager();
    const shadowNode = stateNode.node;
    if (uiManager && shadowNode !== undefined) {
      return callback => uiManager.measureInWindow(shadowNode, callback);
    }
    return null;
  }

  // Paper: the host stateNode is the public instance itself.
  if (hasMeasureInWindow(stateNode)) {
    return callback => stateNode.measureInWindow(callback);
  }
  return null;
}

/** Resolves null when the component has no measurable on-screen view. Never rejects. */
export function measureFiber(fiber: Fiber): Promise<MeasuredRect | null> {
  return new Promise(resolve => {
    const host = findHostFiber(fiber);
    const measureInWindow = host ? resolveMeasureInWindow(host.stateNode) : null;
    if (!measureInWindow) {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => resolve(null), MEASURE_TIMEOUT_MS);
    try {
      measureInWindow((x, y, width, height) => {
        clearTimeout(timeout);
        resolve(width === 0 && height === 0 ? null : { x, y, width, height });
      });
    } catch {
      // Native throws for a view torn down between commit and measure; there is nothing to flash.
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

/**
 * `nativeFabricUIManager` is a JSI global that no RN typings declare, so it is read off
 * globalThis untyped: a global declaration here would not reach consumers type-checking the source.
 */
function readFabricUIManager(): FabricUIManager | null {
  const uiManager: unknown = Reflect.get(globalThis, 'nativeFabricUIManager');
  if (!isRecord(uiManager)) return null;
  const measureNode = uiManager.measureInWindow;
  if (typeof measureNode !== 'function') return null;
  return {
    measureInWindow: (node, callback) => { Reflect.apply(measureNode, uiManager, [node, callback]); },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasMeasureInWindow(value: unknown): value is { measureInWindow: MeasureInWindow } {
  return isRecord(value) && typeof value.measureInWindow === 'function';
}
