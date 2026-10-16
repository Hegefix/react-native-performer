import type { ContextDependency } from '../core/fiber';

export function detectContextChange(
  currentFirstContext: ContextDependency | null,
  previousFirstContext: ContextDependency | null,
): string | null {
  let current = currentFirstContext;
  let previous = previousFirstContext;

  while (current) {
    if (!previous || current.memoizedValue !== previous.memoizedValue) {
      return current.context?.displayName ?? 'UnknownContext';
    }
    current = current.next;
    previous = previous?.next ?? null;
  }

  return null;
}
