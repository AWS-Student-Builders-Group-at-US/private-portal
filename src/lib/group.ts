// Groups items by key. Groups come in order of first appearance and keep the
// items' original order, so already-sorted input stays sorted inside groups.
export function groupBy<T, K extends string | null>(
  items: readonly T[],
  key: (item: T) => K,
): { key: K; items: T[] }[] {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = groups.get(k);
    if (bucket) bucket.push(item);
    else groups.set(k, [item]);
  }
  return [...groups].map(([k, bucket]) => ({ key: k, items: bucket }));
}
