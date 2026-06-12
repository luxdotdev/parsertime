import { statesAt } from "@/lib/win-probability/game-state";
import type { WPEventLog } from "@/lib/win-probability/types";
import { describe, expect, test } from "vitest";

function baseLog(overrides: Partial<WPEventLog> = {}): WPEventLog {
  return {
    modeFamily: "control",
    team1: "Alpha",
    team2: "Bravo",
    mapWinner: null,
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
    objectiveCaptured: [],
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
        { time: 200, team: "Alpha", value: 60, roundNumber: 1 },
        { time: 250, team: "Alpha", value: 99, roundNumber: 1 },
        { time: 400, team: "Bravo", value: 10, roundNumber: 2 },
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

  test("progress events from an earlier round are stale and ignored", () => {
    // Round 1's final ticks can arrive seconds after round 2 starts; their
    // round number marks them stale. Later-round events (flashpoint's
    // r2..r6 under a single round_start) must still apply.
    const log = baseLog({
      rounds: [
        {
          roundNumber: 1,
          start: 0,
          end: 320,
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
        { time: 323, team: "Alpha", value: 96, roundNumber: 1 }, // stale spill
        { time: 340, team: "Bravo", value: 15, roundNumber: 2 },
        { time: 350, team: "Bravo", value: 20, roundNumber: 6 }, // later round: applies
      ],
    });
    const [s] = statesAt(log, [360]);
    expect(s.team1.objProgressOwn).toBe(0); // spill swallowed
    expect(s.team1.objProgressEnemy).toBeCloseTo(0.2);
  });

  test("escort/hybrid: only the round's attacker can generate progress", () => {
    // Loggers sometimes stamp a dying round's final tick with the NEW round's
    // number, defeating staleness checks. Domain rule: the defender cannot
    // push the payload — non-attacker progress is noise.
    const log = baseLog({
      modeFamily: "escort_hybrid",
      rounds: [
        {
          roundNumber: 1,
          start: 0,
          end: 320,
          capturingTeam: "Alpha",
          startScore1: 0,
          startScore2: 0,
          endScore1: 0,
          endScore2: 3,
        },
        {
          roundNumber: 2,
          start: 320,
          end: 600,
          capturingTeam: "Bravo",
          startScore1: 0,
          startScore2: 3,
          endScore1: 1,
          endScore2: 3,
        },
      ],
      progress: [
        { time: 325, team: "Alpha", value: 100, roundNumber: 2 }, // mis-stamped spill
        { time: 400, team: "Bravo", value: 40, roundNumber: 2 },
      ],
    });
    const [s] = statesAt(log, [410]);
    expect(s.team1.objProgressOwn).toBe(0); // Alpha defends r2 — no progress
    expect(s.team1.objProgressEnemy).toBeCloseTo(0.4);
  });

  test("a progress tick sharing the round-start timestamp belongs to the dying round", () => {
    // Real logs emit round 1's final 100% tick at the same instant round 2
    // starts; it must be swallowed by the reset, not leak into round 2.
    const log = baseLog({
      rounds: [
        {
          roundNumber: 1,
          start: 0,
          end: 320,
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
      progress: [{ time: 320, team: "Alpha", value: 100, roundNumber: 1 }],
    });
    const [inRound2] = statesAt(log, [330]);
    expect(inRound2.team1.objProgressOwn).toBe(0);
    expect(inRound2.team2.objProgressEnemy).toBe(0);
  });

  test("timeRemaining counts down from the setup baseline and clamps at 0", () => {
    const log = baseLog();
    const [early, late] = statesAt(log, [100, 290]);
    expect(early.team1.timeRemaining).toBe(140); // 240 − 100
    expect(late.team1.timeRemaining).toBe(0); // clamped
  });

  test("objective captures set control progress and holder, resetting per round", () => {
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
      objectiveCaptured: [
        {
          time: 100,
          team: "Alpha",
          roundNumber: 1,
          objectiveIndex: 0,
          progress1: 10,
          progress2: 0,
        },
        {
          time: 200,
          team: "Bravo",
          roundNumber: 1,
          objectiveIndex: 0,
          progress1: 55,
          progress2: 1,
        },
      ],
    });
    const [early, flipped, nextRound] = statesAt(log, [150, 250, 330]);
    expect(early.team1.controlProgressOwn).toBeCloseTo(0.1);
    expect(early.team1.holdsObjective).toBe(1);
    expect(early.team2.holdsObjective).toBe(-1);
    expect(flipped.team1.controlProgressOwn).toBeCloseTo(0.55);
    expect(flipped.team1.controlProgressEnemy).toBeCloseTo(0.01);
    expect(flipped.team1.holdsObjective).toBe(-1); // Bravo flipped it
    // Round 2 reset: no captures yet.
    expect(nextRound.team1.controlProgressOwn).toBe(0);
    expect(nextRound.team1.holdsObjective).toBe(0);
  });

  test("neutral 'All Teams' captures clear the holder without crediting a team", () => {
    const log = baseLog({
      objectiveCaptured: [
        {
          time: 100,
          team: "Alpha",
          roundNumber: 1,
          objectiveIndex: 0,
          progress1: 20,
          progress2: 0,
        },
        {
          time: 150,
          team: "All Teams",
          roundNumber: 1,
          objectiveIndex: 0,
          progress1: 20,
          progress2: 0,
        },
      ],
    });
    const [held, neutral] = statesAt(log, [120, 160]);
    expect(held.team1.holdsObjective).toBe(1);
    expect(neutral.team1.holdsObjective).toBe(0);
    expect(neutral.team2.holdsObjective).toBe(0);
  });

  test("flashpoint: objective index changes credit the holder and reset point state", () => {
    const log = baseLog({
      modeFamily: "flashpoint",
      rounds: [
        {
          roundNumber: 1,
          start: 0,
          end: 800,
          capturingTeam: "Alpha",
          startScore1: 0,
          startScore2: 0,
          endScore1: 2,
          endScore2: 3,
        },
      ],
      objectiveCaptured: [
        {
          time: 100,
          team: "Alpha",
          roundNumber: 1,
          objectiveIndex: 0,
          progress1: 40,
          progress2: 5,
        },
        // New point: Alpha held point 0 when it ended → Alpha 1-0.
        {
          time: 250,
          team: "Bravo",
          roundNumber: 1,
          objectiveIndex: 1,
          progress1: 0,
          progress2: 30,
        },
      ],
    });
    const [duringFirst, duringSecond] = statesAt(log, [120, 260]);
    expect(duringFirst.team1.scoreDiff).toBe(0);
    expect(duringFirst.team1.controlProgressOwn).toBeCloseTo(0.4);
    // Point 1 underway: Alpha's derived score 1, Bravo 0; control state is fresh.
    expect(duringSecond.team1.scoreDiff).toBe(1);
    expect(duringSecond.team2.scoreDiff).toBe(-1);
    expect(duringSecond.team1.controlProgressOwn).toBe(0);
    expect(duringSecond.team1.controlProgressEnemy).toBeCloseTo(0.3);
    expect(duringSecond.team1.holdsObjective).toBe(-1);
  });

  test("role-split alive diffs bucket deaths by the victim's hero role", () => {
    const log = baseLog({
      kills: [
        { time: 100, victimTeam: "Bravo", victimName: "b1", victimHero: "Reinhardt" },
        { time: 101, victimTeam: "Bravo", victimName: "b2", victimHero: "Ana" },
        { time: 102, victimTeam: "Alpha", victimName: "a1", victimHero: "Tracer" },
      ],
    });
    const [s] = statesAt(log, [105]);
    expect(s.team1.tankAliveDiff).toBe(1); // Rein down on Bravo
    expect(s.team1.supportAliveDiff).toBe(1); // Ana down on Bravo
    expect(s.team1.dpsAliveDiff).toBe(-1); // Tracer down on Alpha
    expect(s.team1.aliveDiff).toBe(1); // sum invariant: 1 + 1 − 1
    expect(s.team2.tankAliveDiff).toBe(-1); // mirror
  });

  test("role splits recover on respawn and rez, restoring the right slot", () => {
    const log = baseLog({
      kills: [
        { time: 100, victimTeam: "Bravo", victimName: "b1", victimHero: "Winston" },
        { time: 105, victimTeam: "Bravo", victimName: "b2", victimHero: "Lúcio" },
      ],
      rezzes: [{ time: 107, team: "Bravo", player: "b2" }],
    });
    // t=108: Winston still dead (respawns 110), Lúcio rezzed
    const [s, after] = statesAt(log, [108, 111]);
    expect(s.team1.tankAliveDiff).toBe(1);
    expect(s.team1.supportAliveDiff).toBe(0);
    expect(after.team1.tankAliveDiff).toBe(0); // respawned
    expect(after.team1.supportAliveDiff).toBe(0);
    expect(after.team1.dpsAliveDiff).toBe(0);
  });

  test("a kill with no hero falls into the Damage bucket, keeping the sum invariant", () => {
    const log = baseLog({
      kills: [{ time: 100, victimTeam: "Bravo", victimName: "b1" }],
    });
    const [s] = statesAt(log, [102]);
    expect(s.team1.dpsAliveDiff).toBe(1);
    expect(s.team1.aliveDiff).toBe(1);
    expect(
      s.team1.tankAliveDiff + s.team1.dpsAliveDiff + s.team1.supportAliveDiff
    ).toBe(s.team1.aliveDiff);
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
    expect(s.team1.tankAliveDiff).toBe(-s.team2.tankAliveDiff);
    expect(s.team1.dpsAliveDiff).toBe(-s.team2.dpsAliveDiff);
    expect(s.team1.supportAliveDiff).toBe(-s.team2.supportAliveDiff);
    expect(s.team1.tankUltDiff).toBe(-s.team2.tankUltDiff);
    expect(s.team1.dpsUltDiff).toBe(-s.team2.dpsUltDiff);
    expect(s.team1.supportUltDiff).toBe(-s.team2.supportUltDiff);
  });

  test("role-split ult bank buckets by hero role and survives death", () => {
    const log = baseLog({
      ultCharged: [
        { time: 50, team: "Alpha", player: "a1", hero: "Sigma" },
        { time: 60, team: "Alpha", player: "a2", hero: "Kiriko" },
        { time: 70, team: "Bravo", player: "b1", hero: "Sojourn" },
      ],
      ultStart: [{ time: 80, team: "Alpha", player: "a1" }],
      kills: [{ time: 75, victimTeam: "Alpha", victimName: "a2", victimHero: "Kiriko" }],
    });
    const [t78, t85] = statesAt(log, [78, 85]);
    expect(t78.team1.tankUltDiff).toBe(1); // Sigma banked
    expect(t78.team1.supportUltDiff).toBe(1); // Kiriko banked (dead, keeps charge)
    expect(t78.team1.dpsUltDiff).toBe(-1); // Sojourn banked on Bravo
    expect(t78.team1.ultBankDiff).toBe(1); // sum invariant
    expect(t85.team1.tankUltDiff).toBe(0); // Sigma spent
    expect(t85.team1.ultBankDiff).toBe(0);
  });

  test("an Echo-duplicated ult counts as Damage, not the copied hero's role", () => {
    const log = baseLog({
      ultCharged: [
        { time: 50, team: "Alpha", player: "a1", hero: "Ana", heroDuplicated: true },
      ],
    });
    const [s] = statesAt(log, [60]);
    expect(s.team1.dpsUltDiff).toBe(1);
    expect(s.team1.supportUltDiff).toBe(0);
  });

  test("an ult charge with no hero falls into the Damage bucket", () => {
    const log = baseLog({
      ultCharged: [{ time: 50, team: "Alpha", player: "a1" }],
    });
    const [s] = statesAt(log, [60]);
    expect(s.team1.dpsUltDiff).toBe(1);
    expect(s.team1.ultBankDiff).toBe(1);
  });

  test("escort/hybrid: overtime flips on when the clock expires but the round persists", () => {
    const log = baseLog({
      modeFamily: "escort_hybrid",
      rounds: [
        {
          roundNumber: 1,
          start: 0,
          end: 400, // round outlives the 240s clock → 240..400 is overtime
          capturingTeam: "Alpha",
          startScore1: 0,
          startScore2: 0,
          endScore1: 1,
          endScore2: 0,
        },
      ],
    });
    const [regulation, overtime, ended] = statesAt(log, [200, 300, 400]);
    expect(regulation.team1.isOvertime).toBe(0);
    expect(overtime.team1.isOvertime).toBe(1);
    expect(overtime.team2.isOvertime).toBe(1); // both perspectives agree
    expect(ended.team1.isOvertime).toBe(0); // round over
  });

  test("overtime requires the current round's setup baseline", () => {
    // Round 2 has no setup_complete yet at t=330 — the stale round-1 baseline
    // (expired long ago) must not flag a fresh round as overtime.
    const log = baseLog({
      modeFamily: "escort_hybrid",
      rounds: [
        {
          roundNumber: 1,
          start: 0,
          end: 300,
          capturingTeam: "Alpha",
          startScore1: 0,
          startScore2: 0,
          endScore1: 0,
          endScore2: 3,
        },
        {
          roundNumber: 2,
          start: 320,
          end: 600,
          capturingTeam: "Bravo",
          startScore1: 0,
          startScore2: 3,
          endScore1: 1,
          endScore2: 3,
        },
      ],
      setupCompletes: [{ time: 0, roundNumber: 1, timeRemaining: 240 }],
    });
    const [s] = statesAt(log, [330]);
    expect(s.team1.isOvertime).toBe(0);
  });

  test("control never reports overtime", () => {
    const log = baseLog(); // control, clock baseline expires at t=240
    const [s] = statesAt(log, [290]);
    expect(s.team1.timeRemaining).toBe(0);
    expect(s.team1.isOvertime).toBe(0);
  });
});
