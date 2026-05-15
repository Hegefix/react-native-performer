import type { CommitEvent, CommitListener, RerenderEvent, RerenderListener } from './types';

const commitListeners = new Set<CommitListener>();
const rerenderListeners = new Set<RerenderListener>();

export function onCommit(listener: CommitListener): () => void {
  commitListeners.add(listener);
  return () => { commitListeners.delete(listener); };
}

export function onRerender(listener: RerenderListener): () => void {
  rerenderListeners.add(listener);
  return () => { rerenderListeners.delete(listener); };
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

export function emitRerender(event: RerenderEvent): void {
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
}

/** Test / reset hook. Not part of the public API. */
export function __clearListenersForTests(): void {
  commitListeners.clear();
  rerenderListeners.clear();
}
