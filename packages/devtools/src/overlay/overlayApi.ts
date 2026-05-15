import type { OverlayOptions } from '../core/types';

type OverlayState = {
  enabled: boolean;
  options: Required<OverlayOptions>;
  listeners: Set<(state: OverlayState) => void>;
};

const DEFAULT_OPTIONS: Required<OverlayOptions> = {
  colorScale: 'default',
  minSeverity: 'all',
  showUnnecessaryOnly: false,
  opacity: 0.3,
  enabled: false,
};

const state: OverlayState = {
  enabled: false,
  options: { ...DEFAULT_OPTIONS },
  listeners: new Set(),
};

function notify(): void {
  for (const listener of state.listeners) {
    listener(state);
  }
}

export function enableOverlay(options: OverlayOptions = {}): void {
  state.enabled = true;
  state.options = {
    ...DEFAULT_OPTIONS,
    ...options,
    enabled: true,
  };
  notify();
}

export function disableOverlay(): void {
  state.enabled = false;
  state.options = { ...state.options, enabled: false };
  notify();
}

export function getOverlayState(): OverlayState {
  return state;
}

export function subscribeOverlay(listener: (state: OverlayState) => void): () => void {
  state.listeners.add(listener);
  return () => { state.listeners.delete(listener); };
}
