import type { RenderedFiberInfo } from './types';

type Fiber = any;

export type EnrichedFiberInfo = RenderedFiberInfo & {
  fiber: Fiber;
  depth: number;
};

export type WalkResult = {
  total: number;
  rendered: EnrichedFiberInfo[];
};

export type WalkOptions = {
  skipHostComponents: boolean;
  maxRenderedSample: number;
};

export function walkFiberTree(
  root: Fiber,
  options: WalkOptions,
): WalkResult {
  const result: WalkResult = { total: 0, rendered: [] };

  const visit = (node: Fiber | null | undefined, depth: number): void => {
    if (!node) return;
    result.total++;

    if (didFiberRender(node)) {
      const isHost = typeof node.type === 'string';
      if (!(options.skipHostComponents && isHost)) {
        if (result.rendered.length < options.maxRenderedSample) {
          result.rendered.push({
            name: getFiberName(node),
            isMount: !node.alternate,
            propsKeys: node.memoizedProps ? Object.keys(node.memoizedProps) : [],
            fiber: node,
            depth,
          });
        }
      }
    }

    if (node.child) visit(node.child, depth + 1);
    if (node.sibling) visit(node.sibling, depth);
  };

  visit(root, 0);
  return result;
}

/**
 * Heuristic: a fiber "rendered" this commit if it has no alternate (mount)
 * or its memoizedProps / memoizedState reference changed vs alternate.
 *
 * This is an approximation. False positives possible on parent-driven
 * rerenders where props are shallow-equal but reference-new.
 * Attribution (distinguishing real vs referential change) is a later step.
 */
export function didFiberRender(fiber: Fiber): boolean {
  if (!fiber.alternate) {
    return fiber.memoizedProps !== undefined;
  }
  if (fiber.memoizedProps !== fiber.alternate.memoizedProps) return true;
  if (fiber.memoizedState !== fiber.alternate.memoizedState) return true;
  return false;
}

export function getFiberName(fiber: Fiber): string {
  const type = fiber.type;
  if (!type) return 'Unknown';
  if (typeof type === 'string') return type;
  // forwardRef / memo wrap the component in { $$typeof, render | type }
  if (typeof type === 'object') {
    const inner = type.render ?? type.type;
    if (inner) return inner.displayName ?? inner.name ?? 'Anonymous';
    return type.displayName ?? 'Anonymous';
  }
  return type.displayName ?? type.name ?? 'Anonymous';
}
