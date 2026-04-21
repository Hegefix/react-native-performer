import type { CommitEvent, CommitListener } from './types';

const listeners = new Set<CommitListener>();

export function onCommit(listener: CommitListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitCommit(event: CommitEvent): void {
  // Snapshot to avoid mutation during iteration.
  const snapshot = Array.from(listeners);
  for (const listener of snapshot) {
    try {
      listener(event);
    } catch (err) {
      // Listener errors must not break the hook. Log and continue.
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[react-native-performer] commit listener threw:', err);
      }
    }
  }
}

/** Test / reset hook. Not part of the public API. */
export function __clearListenersForTests(): void {
  listeners.clear();
}
