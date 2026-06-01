import { describe, expect, it } from "vitest";
import {
  compareByFilenameTimestamp,
  parseLogFilenameTimestamp,
} from "@/components/map/bulk-upload/filename-timestamp";

describe("parseLogFilenameTimestamp", () => {
  it("parses a standard Workshop log filename", () => {
    const ts = parseLogFilenameTimestamp("Log-2023-12-12-22-15-10.txt");
    expect(ts).toBe(new Date(2023, 11, 12, 22, 15, 10).getTime());
  });

  it("parses when the stamp is embedded in a longer name", () => {
    expect(
      parseLogFilenameTimestamp("scrim_Log-2024-01-02-09-30-00_copy.txt")
    ).toBe(new Date(2024, 0, 2, 9, 30, 0).getTime());
  });

  it("returns null for a renamed file without a stamp", () => {
    expect(parseLogFilenameTimestamp("map3.txt")).toBeNull();
    expect(parseLogFilenameTimestamp("kings-row.txt")).toBeNull();
  });

  it("rejects impossible date components instead of rolling over", () => {
    expect(parseLogFilenameTimestamp("Log-2023-13-12-22-15-10.txt")).toBeNull();
    expect(parseLogFilenameTimestamp("Log-2023-02-30-22-15-10.txt")).toBeNull();
  });
});

describe("compareByFilenameTimestamp", () => {
  it("orders timestamped maps chronologically", () => {
    const list = [
      { timestamp: 300, seq: 0 },
      { timestamp: 100, seq: 1 },
      { timestamp: 200, seq: 2 },
    ];
    expect([...list].sort(compareByFilenameTimestamp).map((m) => m.timestamp)).toEqual([
      100, 200, 300,
    ]);
  });

  it("places maps without a timestamp last, preserving add order", () => {
    const list = [
      { timestamp: null, seq: 0 },
      { timestamp: 100, seq: 1 },
      { timestamp: null, seq: 2 },
    ];
    expect([...list].sort(compareByFilenameTimestamp).map((m) => m.seq)).toEqual([
      1, 0, 2,
    ]);
  });

  it("is stable for equal timestamps via seq", () => {
    const list = [
      { timestamp: 100, seq: 2 },
      { timestamp: 100, seq: 0 },
      { timestamp: 100, seq: 1 },
    ];
    expect([...list].sort(compareByFilenameTimestamp).map((m) => m.seq)).toEqual([
      0, 1, 2,
    ]);
  });
});
