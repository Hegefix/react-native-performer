import type { CommitEvent, CommitListener, RerenderEvent, RerenderListener } from './types';
import type { Fiber } from './fiber';

/**
 * Internal-only: the overlay needs the fiber to measure it, but fibers are
 * React private API and must not leak into the public RerenderEvent.
 */
export type RerenderWithFiberListener = (event: RerenderEvent, fiber: Fiber) => void;

const commitListeners = new Set<CommitListener>();
const rerenderListeners = new Set<RerenderListener>();
const rerenderWithFiberListeners = new Set<RerenderWithFiberListener>();

export function onCommit(listener: CommitListener): () => void {
  commitListeners.add(listener);
  return () => { commitListeners.delete(listener); };
}

export function onRerender(listener: RerenderListener): () => void {
  rerenderListeners.add(listener);
  return () => { rerenderListeners.delete(listener); };
}

export function onRerenderWithFiber(listener: RerenderWithFiberListener): () => void {
  rerenderWithFiberListeners.add(listener);
  return () => { rerenderWithFiberListeners.delete(listener); };
}

export function emitCommit(event: CommitEvent): void {
  // Snapshot to avoid mutation during iteration.
  const snapshot = Array.from(commitListeners);
  for (const listener of snapshot) {
    try {
      listener(event);
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[@performer/devtools] commit listener threw:', err);
      }
    }
  }
}

export function emitRerender(event: RerenderEvent, fiber?: Fiber): void {
  const snapshot = Array.from(rerenderListeners);
  for (const listener of snapshot) {
    try {
      listener(event);
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[@performer/devtools] rerender listener threw:', err);
      }
    }
  }

  if (fiber === undefined) return;

  const internalSnapshot = Array.from(rerenderWithFiberListeners);
  for (const listener of internalSnapshot) {
    try {
      listener(event, fiber);
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[@performer/devtools] rerender listener threw:', err);
      }
    }
  }
}

/** Test / reset hook. Not part of the public API. */
export function __clearListenersForTests(): void {
  commitListeners.clear();
  rerenderListeners.clear();
  rerenderWithFiberListeners.clear();
}
