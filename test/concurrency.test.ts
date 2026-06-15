import { describe, expect, test } from "vitest";
import { chunk } from "@/lib/concurrency";

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
