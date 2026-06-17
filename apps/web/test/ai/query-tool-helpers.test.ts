import {
  assertTeamAccess,
  capRowsForModel,
  MODEL_ROW_CAP,
  validateQuerySpec,
} from "@/lib/ai/query-tool-helpers";
import type { QueryResult } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

describe("validateQuerySpec", () => {
  it("accepts a valid spec", () => {
    const res = validateQuerySpec({
      dataset: "player_stat",
      teamId: 5,
      metrics: [{ metric: "eliminations", agg: "avg" }],
    });
    expect(res.ok).toBe(true);
  });

  it("returns readable issues for an invalid spec", () => {
    const res = validateQuerySpec({ dataset: "not_a_dataset", teamId: -1 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.issues.length).toBeGreaterThan(0);
      expect(res.issues.join(" ")).toMatch(/dataset|teamId|metrics/);
    }
  });
});

describe("assertTeamAccess", () => {
  it("passes for an allowed team", () => {
    expect(() => assertTeamAccess(new Set([1, 2]), 2)).not.toThrow();
  });

  it("throws for a disallowed team", () => {
    expect(() => assertTeamAccess(new Set([1]), 9)).toThrow(/access/);
  });
});

function makeResult(rowCount: number): QueryResult {
  return {
    columns: [{ key: "avg__eliminations", label: "Elims", kind: "metric" }],
    rows: Array.from({ length: rowCount }, (_, i) => ({
      avg__eliminations: i,
    })),
    sql: "SELECT ...",
    tables: ["PlayerStat"],
    meta: {
      rowCount,
      teamId: 5,
      teamName: "Team",
      scrimCount: 3,
      durationMs: 1,
      truncated: false,
    },
  };
}

describe("capRowsForModel", () => {
  it("returns all rows when under the cap", () => {
    const capped = capRowsForModel(makeResult(10));
    expect(capped.returnedRows).toBe(10);
    expect(capped.truncatedForModel).toBe(false);
  });

  it("caps rows and flags truncation when over the cap", () => {
    const capped = capRowsForModel(makeResult(MODEL_ROW_CAP + 25));
    expect(capped.returnedRows).toBe(MODEL_ROW_CAP);
    expect(capped.truncatedForModel).toBe(true);
    expect(capped.meta.rowCount).toBe(MODEL_ROW_CAP + 25);
  });
});
