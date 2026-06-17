import { describe, expect, it } from "vitest";
import { countParsedRows } from "@/components/map/bulk-upload/count-rows";
import type { ParserData } from "@/types/parser";

describe("countParsedRows", () => {
  it("returns 0 for undefined", () => {
    expect(countParsedRows(undefined)).toBe(0);
  });

  it("sums the lengths of every event array", () => {
    const data = {
      match_start: [["a"]],
      kill: [["k1"], ["k2"], ["k3"]],
      player_stat: [["p1"], ["p2"]],
    } as unknown as ParserData;
    expect(countParsedRows(data)).toBe(6);
  });

  it("ignores non-array values defensively", () => {
    const data = {
      match_start: [["a"], ["b"]],
      // a stray scalar should not throw or count
      bogus: 5,
    } as unknown as ParserData;
    expect(countParsedRows(data)).toBe(2);
  });
});
