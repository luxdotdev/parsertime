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

/**
 * Map `items` through `fn` while running at most `limit` calls at once.
 * Results are returned in input order. Rejects on the first error.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (limit < 1) {
    throw new Error(`concurrency limit must be >= 1, got ${limit}`);
  }
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
