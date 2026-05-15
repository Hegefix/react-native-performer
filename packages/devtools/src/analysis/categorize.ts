import type { RenderReason } from '../core/types';
import { diffProps } from './propDiff';
import { detectContextChange } from './contextDetect';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fiber = any;

const FORCE_UPDATE_FLAG = 0b0000000100000000000000000000;

export function categorizeRender(fiber: Fiber): RenderReason {
  if (!fiber.alternate) {
    return { type: 'mount' };
  }

  const alt = fiber.alternate;

  if (fiber.flags & FORCE_UPDATE_FLAG) {
    return { type: 'force-update' };
  }

  const contextProvider = detectContextChange(
    fiber.dependencies?.firstContext ?? null,
    alt.dependencies?.firstContext ?? null,
  );
  if (contextProvider) {
    return { type: 'context-changed', provider: contextProvider };
  }

  if (fiber.memoizedProps !== alt.memoizedProps) {
    const changedKeys = diffProps(fiber.memoizedProps, alt.memoizedProps);
    if (changedKeys.length > 0) {
      return { type: 'props-changed', keys: changedKeys };
    }
    // Props reference changed but values are identical — only a parent rerender
    // if state also hasn't changed, otherwise state-changed takes priority.
    if (fiber.memoizedState !== alt.memoizedState) {
      return { type: 'state-changed' };
    }
    return { type: 'parent-rerender' };
  }

  if (fiber.memoizedState !== alt.memoizedState) {
    return { type: 'state-changed' };
  }

  return { type: 'parent-rerender' };
}
