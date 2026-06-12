import { statesAt } from "@/lib/win-probability/game-state";
import type { WPEventLog } from "@/lib/win-probability/types";
import { describe, expect, test } from "vitest";

function baseLog(overrides: Partial<WPEventLog> = {}): WPEventLog {
  return {
    modeFamily: "control",
    team1: "Alpha",
    team2: "Bravo",
    kills: [],
    rezzes: [],
    ultCharged: [],
    ultStart: [],
    rounds: [
      {
        roundNumber: 1,
        start: 0,
        end: 300,
        capturingTeam: "Alpha",
        startScore1: 0,
        startScore2: 0,
        endScore1: 1,
        endScore2: 0,
      },
    ],
    progress: [],
    setupCompletes: [{ time: 0, roundNumber: 1, timeRemaining: 240 }],
    ...overrides,
  };
}

describe("statesAt", () => {
  test("kills create a man advantage that expires after respawn", () => {
    const log = baseLog({
      kills: [{ time: 100, victimTeam: "Bravo", victimName: "b1" }],
    });
    const [before, during, after] = statesAt(log, [99, 105, 111]);
    expect(before.team1.aliveDiff).toBe(0);
    expect(during.team1.aliveDiff).toBe(1);
    expect(during.team2.aliveDiff).toBe(-1);
    expect(after.team1.aliveDiff).toBe(0);
  });

  test("a Mercy rez ends a death early", () => {
    const log = baseLog({
      kills: [{ time: 100, victimTeam: "Bravo", victimName: "b1" }],
      rezzes: [{ time: 103, team: "Bravo", player: "b1" }],
    });
    const [during, afterRez] = statesAt(log, [102, 104]);
    expect(during.team1.aliveDiff).toBe(1);
    expect(afterRez.team1.aliveDiff).toBe(0);
  });

  test("ult bank counts charged minus spent, and survives death", () => {
    const log = baseLog({
      ultCharged: [
        { time: 50, team: "Alpha", player: "a1" },
        { time: 60, team: "Alpha", player: "a2" },
        { time: 70, team: "Bravo", player: "b1" },
      ],
      ultStart: [{ time: 80, team: "Alpha", player: "a1" }],
      kills: [{ time: 75, victimTeam: "Alpha", victimName: "a2" }],
    });
    // t=78: Alpha banked {a1, a2} (a2 dead but keeps charge), Bravo {b1} → diff +1
    // t=85: a1 spent → Alpha {a2}, Bravo {b1} → diff 0
    const [t78, t85] = statesAt(log, [78, 85]);
    expect(t78.team1.ultBankDiff).toBe(1);
    expect(t85.team1.ultBankDiff).toBe(0);
  });

  test("progress tracks latest per team, normalized, and resets each round", () => {
    const log = baseLog({
      rounds: [
        {
          roundNumber: 1,
          start: 0,
          end: 300,
          capturingTeam: "Alpha",
          startScore1: 0,
          startScore2: 0,
          endScore1: 1,
          endScore2: 0,
        },
        {
          roundNumber: 2,
          start: 320,
          end: 600,
          capturingTeam: "Bravo",
          startScore1: 1,
          startScore2: 0,
          endScore1: 1,
          endScore2: 1,
        },
      ],
      progress: [
        { time: 200, team: "Alpha", value: 60 },
        { time: 250, team: "Alpha", value: 99 },
        { time: 400, team: "Bravo", value: 10 },
      ],
    });
    const [r1, r2] = statesAt(log, [260, 401]);
    expect(r1.team1.objProgressOwn).toBeCloseTo(0.99);
    expect(r1.team2.objProgressEnemy).toBeCloseTo(0.99);
    // round 2 reset Alpha's progress; Bravo at 0.10
    expect(r2.team1.objProgressOwn).toBe(0);
    expect(r2.team1.objProgressEnemy).toBeCloseTo(0.1);
    expect(r2.team1.scoreDiff).toBe(1); // 1–0 entering round 2
    expect(r2.team2.isAttacker).toBe(1);
    expect(r2.team1.isAttacker).toBe(0);
  });

  test("timeRemaining counts down from the setup baseline and clamps at 0", () => {
    const log = baseLog();
    const [early, late] = statesAt(log, [100, 290]);
    expect(early.team1.timeRemaining).toBe(140); // 240 − 100
    expect(late.team1.timeRemaining).toBe(0); // clamped
  });

  test("snapshots are mirror images", () => {
    const log = baseLog({
      kills: [{ time: 100, victimTeam: "Bravo", victimName: "b1" }],
      ultCharged: [{ time: 50, team: "Alpha", player: "a1" }],
    });
    const [s] = statesAt(log, [102]);
    expect(s.team1.aliveDiff).toBe(-s.team2.aliveDiff);
    expect(s.team1.ultBankDiff).toBe(-s.team2.ultBankDiff);
    expect(s.team1.objProgressOwn).toBe(s.team2.objProgressEnemy);
  });
});
