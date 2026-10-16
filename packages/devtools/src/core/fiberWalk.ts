import type { RenderedFiberInfo } from './types';
import { FiberTag, PerformedWork, type Fiber } from './fiber';

export type EnrichedFiberInfo = RenderedFiberInfo & {
  fiber: Fiber;
  depth: number;
};

export type WalkResult = {
  /** Fibers visited: the part of the tree React worked on in this commit. */
  total: number;
  rendered: EnrichedFiberInfo[];
};

export type WalkOptions = {
  skipHostComponents: boolean;
};

type Frame = {
  fiber: Fiber;
  depth: number;
  isMount: boolean;
};

const COMPONENT_TAGS: ReadonlySet<number> = new Set([
  FiberTag.FunctionComponent,
  FiberTag.ClassComponent,
  FiberTag.ForwardRef,
  FiberTag.SimpleMemoComponent,
]);

const HOST_TAGS: ReadonlySet<number> = new Set([
  FiberTag.HostComponent,
  FiberTag.HostHoistable,
  FiberTag.HostSingleton,
]);

/**
 * Walks only the part of the tree React touched in this commit, the way React
 * DevTools does. When `fiber.child === alternate.child` React bailed out and
 * reused the subtree as-is, so its fibers carry flags and alternates from some
 * earlier commit and must not be inspected. A fiber with no alternate inside
 * the touched part is a fresh mount, and so is everything below it.
 *
 * Iterative because Hermes has a shallow native stack and RN trees get deep.
 */
export function walkFiberTree(root: Fiber, options: WalkOptions): WalkResult {
  const result: WalkResult = { total: 0, rendered: [] };
  const stack: Frame[] = [{ fiber: root, depth: 0, isMount: root.alternate === null }];

  for (let frame = stack.pop(); frame; frame = stack.pop()) {
    const { fiber, depth, isMount } = frame;
    result.total++;

    if (didFiberRender(fiber, isMount)) {
      const isHost = HOST_TAGS.has(fiber.tag);
      if (!(options.skipHostComponents && isHost)) {
        result.rendered.push({
          name: getFiberName(fiber),
          isMount,
          propsKeys: isRecord(fiber.memoizedProps) ? Object.keys(fiber.memoizedProps) : [],
          fiber,
          depth,
        });
      }
    }

    const previous = fiber.alternate;
    if (!isMount && previous !== null && fiber.child === previous.child) continue;

    // Fill back to front so children pop in document order.
    let slot = stack.length - 1;
    for (let child = fiber.child; child; child = child.sibling) slot++;
    for (let child = fiber.child; child; child = child.sibling) {
      stack[slot--] = { fiber: child, depth: depth + 1, isMount: isMount || child.alternate === null };
    }
  }

  return result;
}

/**
 * Only meaningful for fibers inside the touched part of the tree (see
 * walkFiberTree). Components: React sets PerformedWork exactly when the render
 * function ran, which also covers context-driven renders that keep props and
 * state references. Host components have no render function, so a new props
 * object is what makes them "rendered".
 */
export function didFiberRender(fiber: Fiber, isMount: boolean): boolean {
  if (COMPONENT_TAGS.has(fiber.tag)) {
    return isMount || (fiber.flags & PerformedWork) !== 0;
  }
  if (HOST_TAGS.has(fiber.tag)) {
    return isMount || fiber.memoizedProps !== fiber.alternate?.memoizedProps;
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const REACT_MEMO_TYPE = Symbol.for('react.memo');
const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
const REACT_LAZY_TYPE = Symbol.for('react.lazy');
const MAX_WRAPPER_DEPTH = 8;

export function getFiberName(fiber: Fiber): string {
  if (fiber.tag === FiberTag.ContextProvider) return `${getContextName(fiber.type)}.Provider`;
  if (fiber.tag === FiberTag.ContextConsumer) return `${getContextName(fiber.type)}.Consumer`;
  return getTypeName(fiber.type);
}

/** Unwraps memo / forwardRef (in any nesting) down to the component, unless a wrapper has its own displayName. */
function getTypeName(type: unknown): string {
  let current = type;
  for (let depth = 0; depth < MAX_WRAPPER_DEPTH; depth++) {
    if (typeof current === 'string') return current;
    if (typeof current === 'function') return readDisplayName(current) ?? (current.name || 'Anonymous');
    if (!isRecord(current)) return 'Unknown';

    const displayName = readDisplayName(current);
    if (displayName) return displayName;

    const kind = current.$$typeof;
    if (kind === REACT_MEMO_TYPE) current = current.type;
    else if (kind === REACT_FORWARD_REF_TYPE) current = current.render;
    else if (kind === REACT_LAZY_TYPE) return 'Lazy';
    else return 'Anonymous';
  }
  return 'Anonymous';
}

/**
 * React 19: a Provider fiber's type is the context, a Consumer's is
 * `{ _context }`. React 18 is the other way round. Either way the context is
 * `type._context` if present, else `type`.
 */
function getContextName(type: unknown): string {
  if (!isRecord(type)) return 'Context';
  const context = isRecord(type._context) ? type._context : type;
  return readDisplayName(context) ?? 'Context';
}

function readDisplayName(value: object): string | undefined {
  if (!('displayName' in value)) return undefined;
  const { displayName } = value;
  return typeof displayName === 'string' && displayName !== '' ? displayName : undefined;
}

