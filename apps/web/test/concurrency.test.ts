import { describe, expect, test } from "vitest";
import { chunk, mapWithConcurrency } from "@/lib/concurrency";

describe("chunk", () => {
  test("splits into consecutive batches of at most `size`", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test("returns an empty array for empty input", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  test("returns a single batch when size exceeds length", () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  test("throws when size < 1", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});

describe("mapWithConcurrency", () => {
  test("preserves input order in results", async () => {
    const out = await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (n) => n * 2
    );
    expect(out).toEqual([2, 4, 6, 8, 10]);
  });

  test("runs at most `limit` tasks concurrently", async () => {
    let active = 0;
    let peak = 0;
    async function track(n: number) {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n;
    }
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, track);
    expect(peak).toBe(3);
  });

  test("handles empty input", async () => {
    expect(await mapWithConcurrency([], 3, async (n) => n)).toEqual([]);
  });

  test("throws when limit < 1", async () => {
    await expect(mapWithConcurrency([1], 0, async (n) => n)).rejects.toThrow();
  });
});
