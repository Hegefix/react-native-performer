/**
 * Minimal shape of React's private Fiber, limited to the fields this library
 * reads. Field names and tag numbers match React 18 and 19.
 */
export interface Fiber {
  tag: number;
  type: unknown;
  flags: number;
  child: Fiber | null;
  sibling: Fiber | null;
  alternate: Fiber | null;
  memoizedProps: unknown;
  memoizedState: unknown;
  dependencies: FiberDependencies | null;
}

export interface FiberRoot {
  current: Fiber;
}

export interface FiberDependencies {
  firstContext: ContextDependency | null;
}

export interface ContextDependency {
  context: { displayName?: string };
  memoizedValue: unknown;
  next: ContextDependency | null;
}

/** One entry of a function component's hook list (`fiber.memoizedState`). */
export interface Hook {
  memoizedState: unknown;
  queue: unknown;
  next: Hook | null;
}

export const FiberTag = {
  FunctionComponent: 0,
  ClassComponent: 1,
  HostRoot: 3,
  HostComponent: 5,
  HostText: 6,
  ContextConsumer: 9,
  ContextProvider: 10,
  ForwardRef: 11,
  MemoComponent: 14,
  SimpleMemoComponent: 15,
  HostHoistable: 26,
  HostSingleton: 27,
} as const;

/** Set by beginWork on every fiber whose render function actually ran. */
export const PerformedWork = 0b1;
