import { FEATURE_NAMES } from "@/lib/win-probability/features";
import { datasetToCsv } from "@/lib/win-probability/training/csv";
import type { DatasetRow } from "@/lib/win-probability/types";
import { expect, test } from "vitest";

test("emits the canonical header from FEATURE_NAMES", () => {
  const csv = datasetToCsv([]);
  const [header] = csv.split("\n");
  expect(header).toBe(`matchId,roundId,label,${FEATURE_NAMES.join(",")}`);
});

test("serializes a row with known features", () => {
  const features = FEATURE_NAMES.map((_, i) => i + 0.5);
  const rows: DatasetRow[] = [
    { matchId: 42, roundId: "42-3", label: 1, features },
  ];
  const csv = datasetToCsv(rows);
  const lines = csv.split("\n");
  expect(lines[1]).toBe(`42,42-3,1,${features.join(",")}`);
  // Header + one data line + trailing newline → empty final element.
  expect(lines[2]).toBe("");
});

test("round-trips features back to the same numbers", () => {
  const features = FEATURE_NAMES.map((_, i) => i * 1.25 - 3);
  const rows: DatasetRow[] = [
    { matchId: 7, roundId: "7-1", label: 0, features },
  ];
  const csv = datasetToCsv(rows);
  const dataLine = csv.split("\n")[1];
  const cols = dataLine.split(",");
  expect(Number(cols[0])).toBe(7);
  expect(cols[1]).toBe("7-1");
  expect(Number(cols[2])).toBe(0);
  const parsed = cols.slice(3).map(Number);
  expect(parsed).toEqual(features);
});

test("writes one data line per row", () => {
  const features = FEATURE_NAMES.map(() => 1);
  const rows: DatasetRow[] = [
    { matchId: 1, roundId: "1-1", label: 0, features },
    { matchId: 1, roundId: "1-2", label: 1, features },
    { matchId: 2, roundId: "2-1", label: 1, features },
  ];
  const csv = datasetToCsv(rows);
  // 1 header + 3 data + trailing newline.
  expect(csv.split("\n")).toHaveLength(5);
});
