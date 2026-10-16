import type { Fiber } from '../core/fiber';

type FiberWithReturn = Fiber & { return?: FiberWithReturn | null };

/** Component types whose whole subtree is the library's own UI (overlay, HUD). */
const ownSubtreeTypes = new WeakSet<object>();
/** Component types that are ours but render app content as children: only the fiber itself is ours. */
const ownWrapperTypes = new WeakSet<object>();

export function markOwnSubtree(type: object): void {
  ownSubtreeTypes.add(type);
}

export function markOwnWrapper(type: object): void {
  ownWrapperTypes.add(type);
}

/**
 * The overlay and HUD mount in the app's own React root, so their fibers sit in
 * the same tree as app fibers and can only be told apart by ancestry.
 */
export function isOwnFiber(fiber: Fiber): boolean {
  if (isComponentType(fiber.type) && ownWrapperTypes.has(fiber.type)) return true;

  for (let node: FiberWithReturn | null | undefined = fiber; node; node = node.return) {
    if (isComponentType(node.type) && ownSubtreeTypes.has(node.type)) return true;
  }
  return false;
}

function isComponentType(type: unknown): type is object {
  return typeof type === 'function' || (typeof type === 'object' && type !== null);
}
