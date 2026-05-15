type ContextDependency = {
  context: { displayName?: string };
  memoizedValue: unknown;
  next: ContextDependency | null;
} | null;

export function detectContextChange(
  currentFirstContext: ContextDependency,
  previousFirstContext: ContextDependency,
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
