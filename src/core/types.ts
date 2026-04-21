/**
 * A single fiber that was rendered in a commit.
 * Fiber internals are React private API — treat these fields as best-effort.
 */
export type RenderedFiberInfo = {
  /** Best-effort component name: displayName, function name, or 'Anonymous' / 'Unknown'. */
  name: string;
  /** Was this a mount (no previous alternate)? */
  isMount: boolean;
  /** Keys of memoizedProps, if available. Empty array if props were null/undefined. */
  propsKeys: string[];
};

/**
 * A single commit event emitted by the hook.
 */
export type CommitEvent = {
  /** Monotonically increasing commit counter per attach session. */
  commitId: number;
  /** Timestamp (performance.now()) when the commit was observed. */
  timestamp: number;
  /** Renderer ID from React (usually 1 for RN). */
  rendererId: number;
  /** Total fibers walked in this commit. */
  totalFibers: number;
  /** Fibers that React marked as rendered (mount or changed memoizedProps/memoizedState). */
  renderedFibers: RenderedFiberInfo[];
};

/**
 * Listener signature for commit events.
 */
export type CommitListener = (event: CommitEvent) => void;

/**
 * Result of attachHook(). Call detach() to remove the patch.
 */
export type AttachHandle = {
  detach: () => void;
  /** True if attach succeeded (hook was present and not already patched by us). */
  attached: boolean;
};

export type AttachOptions = {
  /**
   * If true, skip host components (strings like 'View', 'RCTText') from renderedFibers.
   * Default: false (include everything, filtering is consumer's job).
   */
  skipHostComponents?: boolean;
};
