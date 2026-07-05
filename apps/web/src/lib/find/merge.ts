/**
 * Shift prevention for async results (the Vercel Find rule set):
 *
 * 1. The focused result is never removed and never changes position — even
 *    if the fresh result set no longer contains it.
 * 2. Any previous result that also exists in the fresh set keeps its
 *    position.
 * 3. Remaining slots are filled with the highest-ranked fresh results, in
 *    rank order, so the best new result always appears somewhere.
 *
 * The effect: nothing moves out from under the user's selection, and fewer
 * rows change at once, so incoming results are easy to parse.
 */
export function mergeStable<T extends { key: string }>(
  prev: readonly T[],
  next: readonly T[],
  focusedKey: string | null,
  max = 8
): T[] {
  if (prev.length === 0) return next.slice(0, max);

  const nextKeys = new Set(next.map((r) => r.key));

  // Survivors keep their previous index. The focused row survives
  // unconditionally; everything else survives only if the fresh set still
  // contains it.
  const survivors = new Map<number, T>();
  for (let i = 0; i < prev.length && i < max; i++) {
    const item = prev[i];
    if (item.key === focusedKey || nextKeys.has(item.key)) {
      survivors.set(i, item);
    }
  }

  let size = Math.min(max, Math.max(next.length, prev.length));
  for (const index of survivors.keys()) {
    size = Math.max(size, index + 1);
  }
  size = Math.min(size, max);

  const placed = new Set<string>();
  const slots: (T | null)[] = new Array<T | null>(size).fill(null);
  for (const [index, item] of survivors) {
    if (index < size) {
      slots[index] = item;
      placed.add(item.key);
    }
  }

  // Fill the vacated slots with the best fresh results, preserving rank order.
  const incoming = next.filter((r) => !placed.has(r.key));
  for (let i = 0; i < slots.length && incoming.length > 0; i++) {
    slots[i] ??= incoming.shift() ?? null;
  }

  // If the fresh set was too small to fill every hole, keep the stale rows
  // that were there before (stable beats shifting), then drop what's left.
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] !== null) continue;
    const stale = prev[i];
    if (stale && !placed.has(stale.key) && !nextKeys.has(stale.key)) {
      slots[i] = stale;
      placed.add(stale.key);
    }
  }

  return slots.filter((s): s is T => s !== null);
}
