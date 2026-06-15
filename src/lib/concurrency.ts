/** Split `items` into consecutive chunks of at most `size` elements. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) {
    throw new Error(`chunk size must be >= 1, got ${size}`);
  }
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
