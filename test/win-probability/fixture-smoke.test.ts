import { parseDataFromTXT } from "@/lib/parser";
import { buildRows } from "@/lib/win-probability/training/extract";
import {
  mapTypeToModeFamily,
  type WPEventLog,
} from "@/lib/win-probability/types";
import type { ParserData } from "@/types/parser";
import * as fs from "node:fs";
import { describe, expect, test } from "vitest";

/** Tuple rows for one event type; positions per src/lib/parser/schema.ts. */
function rowsOf(data: ParserData, key: keyof ParserData): unknown[][] {
  return (data[key] ?? []) as unknown[][];
}

function workbookToEventLog(data: ParserData): WPEventLog | null {
  const ms = rowsOf(data, "match_start")[0];
  if (ms === undefined) return null;
  const modeFamily = mapTypeToModeFamily(String(ms[3]));
  if (modeFamily === null) return null;
  const team1 = String(ms[4]);
  const team2 = String(ms[5]);

  const starts = rowsOf(data, "round_start");
  const endsByRound = new Map(
    rowsOf(data, "round_end").map((r) => [Number(r[2]), r])
  );
  const rounds = starts.flatMap((rs) => {
    const re = endsByRound.get(Number(rs[2]));
    if (re === undefined) return [];
    return [
      {
        roundNumber: Number(rs[2]),
        start: Number(rs[1]),
        end: Number(re[1]),
        capturingTeam: String(rs[3]),
        startScore1: Number(rs[4]),
        startScore2: Number(rs[5]),
        endScore1: Number(re[4]),
        endScore2: Number(re[5]),
      },
    ];
  });

  return {
    modeFamily,
    team1,
    team2,
    mapWinner: null, // score fallback suffices for the control fixture
    kills: rowsOf(data, "kill").map((r) => ({
      time: Number(r[1]),
      victimTeam: String(r[5]),
      victimName: String(r[6]),
      attackerTeam: String(r[2]),
      attackerName: String(r[3]),
    })),
    rezzes: rowsOf(data, "mercy_rez").map((r) => ({
      time: Number(r[1]),
      team: String(r[5]),
      player: String(r[6]),
    })),
    ultCharged: rowsOf(data, "ultimate_charged").map((r) => ({
      time: Number(r[1]),
      team: String(r[2]),
      player: String(r[3]),
    })),
    ultStart: rowsOf(data, "ultimate_start").map((r) => ({
      time: Number(r[1]),
      team: String(r[2]),
      player: String(r[3]),
    })),
    rounds,
    progress: [
      ...rowsOf(data, "point_progress").map((r) => ({
        time: Number(r[1]),
        team: String(r[3]),
        value: Number(r[5]),
        roundNumber: Number(r[2]),
      })),
      ...rowsOf(data, "payload_progress").map((r) => ({
        time: Number(r[1]),
        team: String(r[3]),
        value: Number(r[5]),
        roundNumber: Number(r[2]),
      })),
    ],
    objectiveCaptured: rowsOf(data, "objective_captured").map((r) => ({
      time: Number(r[1]),
      team: String(r[3]),
      roundNumber: Number(r[2]),
      objectiveIndex: Number(r[4]),
      progress1: Number(r[5]),
      progress2: Number(r[6]),
    })),
    setupCompletes: rowsOf(data, "setup_complete").map((r) => ({
      time: Number(r[1]),
      roundNumber: Number(r[2]),
      timeRemaining: Number(r[3]),
    })),
  };
}

describe("WP reconstruction on a real parsed log", () => {
  test("produces sane labeled rows from a sample fixture", async () => {
    const file = fs.readFileSync(
      "./test/samples/Log-2024-01-22-20-02-45.txt",
      "utf8"
    );
    // @ts-expect-error - cannot pass File type in node (matches parser tests)
    const data = await parseDataFromTXT(file);
    const log = workbookToEventLog(data);
    expect(log).not.toBeNull();

    const rows = buildRows(log!, 1);
    expect(rows.length).toBeGreaterThan(50);
    expect(rows.length % 2).toBe(0);

    for (const row of rows) {
      // New feature order (21 features): tankAliveDiff[0], dpsAliveDiff[1],
      // supportAliveDiff[2], tankUltDiff[3], dpsUltDiff[4], supportUltDiff[5],
      // scoreDiff[6], timeRemainingNorm[7], objProgressOwn[8], objProgressEnemy[9], ...
      const [
        tankAliveDiff,
        dpsAliveDiff,
        supportAliveDiff,
        ,
        ,
        ,
        ,
        timeNorm,
        objOwn,
        objEnemy,
      ] = row.features;
      // The fixture log omits hero data so all kills default to "Damage" role;
      // role-split diffs can reach ±5 in that case. Sanity-check the sum.
      const totalAliveDiff = tankAliveDiff + dpsAliveDiff + supportAliveDiff;
      expect(Math.abs(tankAliveDiff)).toBeLessThanOrEqual(5);
      expect(Math.abs(dpsAliveDiff)).toBeLessThanOrEqual(5);
      expect(Math.abs(supportAliveDiff)).toBeLessThanOrEqual(5);
      expect(Math.abs(totalAliveDiff)).toBeLessThanOrEqual(5);
      expect(timeNorm).toBeGreaterThanOrEqual(0);
      expect(timeNorm).toBeLessThanOrEqual(1);
      expect(objOwn).toBeGreaterThanOrEqual(0);
      expect(objOwn).toBeLessThanOrEqual(1);
      expect(objEnemy).toBeGreaterThanOrEqual(0);
      expect(objEnemy).toBeLessThanOrEqual(1);
      expect([0, 1]).toContain(row.label);
    }

    // Mirrored pairs: labels complement, tankAliveDiff (pos 0) negates.
    for (let i = 0; i < rows.length; i += 2) {
      expect(rows[i].label + rows[i + 1].label).toBe(1);
      expect(rows[i].features[0]).toBe(-rows[i + 1].features[0]);
    }
  });
});
