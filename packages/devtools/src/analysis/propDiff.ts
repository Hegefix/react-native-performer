type Props = Record<string, unknown> | null | undefined;

export function diffProps(
  prevProps: Props,
  nextProps: Props,
): string[] {
  if (prevProps === nextProps) return [];

  const prev = prevProps ?? {};
  const next = nextProps ?? {};

  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changed: string[] = [];

  for (const key of allKeys) {
    if (!isEqual(prev[key], next[key])) {
      changed.push(key);
    }
  }

  return changed;
}

function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  return false;
}
