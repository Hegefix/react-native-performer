import type { RenderReason } from '../core/types';
import { FiberTag, type Fiber, type Hook } from '../core/fiber';
import { compareProps } from './propDiff';
import { detectContextChange } from './contextDetect';

const HOOK_LIST_TAGS: ReadonlySet<number> = new Set([
  FiberTag.FunctionComponent,
  FiberTag.ForwardRef,
  FiberTag.SimpleMemoComponent,
]);

export function categorizeRender(fiber: Fiber): RenderReason {
  const previous = fiber.alternate;
  if (!previous) {
    return { type: 'mount' };
  }

  const contextProvider = detectContextChange(
    fiber.dependencies?.firstContext ?? null,
    previous.dependencies?.firstContext ?? null,
  );
  if (contextProvider) {
    return { type: 'context-changed', provider: contextProvider };
  }

  const props = compareProps(toProps(previous.memoizedProps), toProps(fiber.memoizedProps));
  if (props.changed.length > 0) {
    return { type: 'props-changed', keys: props.changed };
  }

  if (didStateChange(fiber, previous)) {
    return { type: 'state-changed' };
  }

  // A class only re-renders with the same props, state and context when
  // forceUpdate() bypassed shouldComponentUpdate.
  if (fiber.tag === FiberTag.ClassComponent && fiber.memoizedProps === previous.memoizedProps) {
    return { type: 'force-update' };
  }

  return props.referenceOnly.length > 0
    ? { type: 'parent-rerender', referenceOnlyKeys: props.referenceOnly }
    : { type: 'parent-rerender' };
}

/**
 * Function components keep their hooks as a linked list in memoizedState,
 * and React clones every hook on each render, so the list itself is always
 * new. Only hooks with an update queue (useState, useReducer,
 * useSyncExternalStore, ...) hold state; effects, refs and memos don't.
 */
function didStateChange(fiber: Fiber, previous: Fiber): boolean {
  if (!HOOK_LIST_TAGS.has(fiber.tag)) {
    return fiber.memoizedState !== previous.memoizedState;
  }

  let nextHook = toHook(fiber.memoizedState);
  let prevHook = toHook(previous.memoizedState);
  while (nextHook && prevHook) {
    if (nextHook.queue !== null && !Object.is(nextHook.memoizedState, prevHook.memoizedState)) {
      return true;
    }
    nextHook = nextHook.next;
    prevHook = prevHook.next;
  }
  return false;
}

function toHook(value: unknown): Hook | null {
  return isHook(value) ? value : null;
}

function isHook(value: unknown): value is Hook {
  return (
    typeof value === 'object' &&
    value !== null &&
    'memoizedState' in value &&
    'queue' in value &&
    'next' in value
  );
}

function toProps(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
