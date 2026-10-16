type Props = Record<string, unknown> | null | undefined;

export type PropComparison = {
  /** Keys whose values differ. */
  changed: string[];
  /** Keys whose values are new references with the same entries. */
  referenceOnly: string[];
};

/**
 * Keys whose values differ. A value that is a new object or array with the
 * same entries (an inline `style={{ flex: 1 }}`) counts as unchanged: the
 * parent rebuilt it, it carries nothing new. Functions are compared by
 * reference, since a new closure can capture different values.
 */
export function diffProps(
  prevProps: Props,
  nextProps: Props,
): string[] {
  return compareProps(prevProps, nextProps).changed;
}

export function compareProps(
  prevProps: Props,
  nextProps: Props,
): PropComparison {
  const result: PropComparison = { changed: [], referenceOnly: [] };
  if (prevProps === nextProps) return result;

  const prev = prevProps ?? {};
  const next = nextProps ?? {};

  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    const prevValue = prev[key];
    const nextValue = next[key];
    if (Object.is(prevValue, nextValue)) continue;
    if (isShallowEqual(prevValue, nextValue)) {
      result.referenceOnly.push(key);
    } else {
      result.changed.push(key);
    }
  }

  return result;
}

function isShallowEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    if (aKeys.length !== Object.keys(b).length) return false;
    return aKeys.every(key => Object.prototype.hasOwnProperty.call(b, key) && Object.is(a[key], b[key]));
  }
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
