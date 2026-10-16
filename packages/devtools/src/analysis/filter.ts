import type { FilterConfig, RerenderEvent } from '../core/types';
import type { Fiber } from '../core/fiber';
import { isOwnFiber } from './ownFibers';

const HOST_COMPONENT_TAG = 5;

export const DEFAULT_FILTER: FilterConfig = {
  ignoreComponents: [
    'NavigationContainer',
    'GestureHandlerRootView',
    'SafeAreaProvider',
    'SafeAreaInsetsContext',
    'ThemeProvider',
  ],
  ignorePatterns: [/^RCT/, /^__/],
  ignoreHostComponents: true,
  onlyUnnecessary: false,
};

export function shouldInclude(
  event: RerenderEvent,
  filter: FilterConfig,
  fiber?: Fiber,
): boolean {
  // Overlay and HUD commit on every flash; reporting them would feed the overlay its own renders.
  if (fiber !== undefined && isOwnFiber(fiber)) {
    return false;
  }

  const { component } = event;

  if (filter.ignoreComponents?.includes(component.name)) {
    return false;
  }

  if (filter.ignorePatterns?.some(pattern => pattern.test(component.name))) {
    return false;
  }

  if (filter.ignoreHostComponents && component.fiberTag === HOST_COMPONENT_TAG) {
    return false;
  }

  if (filter.onlyUnnecessary && !event.isUnnecessary) {
    return false;
  }

  if (filter.minRenderCount !== undefined && event.renderCount < filter.minRenderCount) {
    return false;
  }

  if (filter.maxDepth !== undefined && component.depth > filter.maxDepth) {
    return false;
  }

  return true;
}
