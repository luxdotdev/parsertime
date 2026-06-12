import { FEATURE_NAMES, featureHash } from "@/lib/win-probability/features";
import type { ModelArtifact } from "@/lib/win-probability/model";
import { computeMatchStory } from "@/lib/win-probability/timeline";
import type { WPEventLog } from "@/lib/win-probability/types";
import { describe, expect, test } from "vitest";

/** Identity-scaled artifact: wp = sigmoid(Σ weight·feature). */
function testArtifact(weightsByName: Record<string, number>): ModelArtifact {
  const weights = FEATURE_NAMES.map((n) => weightsByName[n] ?? 0);
  const dims = FEATURE_NAMES.length;
  const family = {
    weights,
    bias: 0,
    means: new Array<number>(dims).fill(0),
    stds: new Array<number>(dims).fill(1),
    sampleCount: 50_000,
  };
  return {
    schemaVersion: 1,
    modelVersion: 1,
    createdAt: "2026-06-12T00:00:00.000Z",
    featureHash: featureHash(),
    modeFamilies: {
      control: family,
      escort_hybrid: family,
      push: family,
      flashpoint: family,
    },
  };
}

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
        end: 200,
        capturingTeam: "Alpha",
        startScore1: 0,
        startScore2: 0,
        endScore1: 1,
        endScore2: 0,
      },
    ],
    progress: [],
    objectiveCaptured: [],
    setupCompletes: [],
    ...overrides,
  };
}

function engagement(
  start: number,
  end: number,
  winner: string | null,
  kills: Record<string, number>
) {
  return {
    start,
    end,
    zoneName: "Point A",
    winner,
    killsByTeam: kills,
    participants: [] as string[],
  };
}

describe("computeMatchStory — series", () => {
  test("neutral states sit at 0.5 and the curve snaps to the round outcome", () => {
    const story = computeMatchStory({
      log: baseLog(),
      artifact: testArtifact({ aliveDiff: 1 }),
      engagements: [],
      assists: [],
    });
    expect(story).not.toBeNull();
    expect(story!.points[0].wp).toBeCloseTo(0.5);
    const last = story!.points[story!.points.length - 1];
    expect(last.t).toBe(200);
    expect(last.wp).toBe(1); // Alpha won the round → snap to 1
    expect(last.snap).toBe(true); // outcome dot, not part of the line
    expect(story!.points[0].snap).toBeUndefined();
    expect(story!.points[0].scoreDiff).toBe(0); // tooltip context present
    expect(story!.roundMarkers).toEqual([0]);
    expect(story!.limited).toBe(true); // no ult events in this log
  });

  test("objective captures become team-attributed markers; neutral unlocks are dropped", () => {
    const story = computeMatchStory({
      log: baseLog({
        objectiveCaptured: [
          { time: 50, team: "Alpha", roundNumber: 1, objectiveIndex: 0, progress1: 10, progress2: 0 },
          { time: 90, team: "All Teams", roundNumber: 1, objectiveIndex: 0, progress1: 10, progress2: 0 },
          { time: 120, team: "Bravo", roundNumber: 1, objectiveIndex: 0, progress1: 10, progress2: 5 },
        ],
      }),
      artifact: testArtifact({ aliveDiff: 1 }),
      engagements: [],
      assists: [],
    })!;
    expect(story.objectiveMarkers).toEqual([
      { t: 50, team: "Alpha" },
      { t: 120, team: "Bravo" },
    ]);
  });

  test("returns null when the mode family has no model", () => {
    const artifact = testArtifact({ aliveDiff: 1 });
    artifact.modeFamilies.control = null;
    expect(
      computeMatchStory({
        log: baseLog(),
        artifact,
        engagements: [],
        assists: [],
      })
    ).toBeNull();
  });
});

describe("computeMatchStory — ledger and cascades", () => {
  test("a lost fight produces a negative swing of believable size", () => {
    const log = baseLog({
      kills: [
        { time: 100, victimTeam: "Alpha", victimName: "a1", attackerTeam: "Bravo", attackerName: "b1" },
        { time: 102, victimTeam: "Alpha", victimName: "a2", attackerTeam: "Bravo", attackerName: "b1" },
        { time: 104, victimTeam: "Alpha", victimName: "a3", attackerTeam: "Bravo", attackerName: "b2" },
      ],
    });
    const story = computeMatchStory({
      log,
      artifact: testArtifact({ aliveDiff: 1 }),
      engagements: [engagement(100, 104, "Bravo", { Bravo: 3 })],
      assists: [],
    })!;
    const [fight] = story.fights;
    expect(fight.wpBefore).toBeCloseTo(0.5, 1);
    expect(fight.swing).toBeLessThan(-0.3);
    expect(fight.killsTeam2).toBe(3);
    expect(fight.winner).toBe("Bravo");
    expect(fight.carryover).toBeNull(); // first fight inherits nothing
  });

  test("enemy ult advantage entering a fight shows as negative carryover", () => {
    const log = baseLog({
      ultCharged: [
        { time: 50, team: "Alpha", player: "a1" },
        { time: 52, team: "Bravo", player: "b1" },
        { time: 54, team: "Bravo", player: "b2" },
      ],
      ultStart: [{ time: 100, team: "Alpha", player: "a1" }],
      kills: [
        { time: 101, victimTeam: "Alpha", victimName: "a1", attackerTeam: "Bravo", attackerName: "b1" },
      ],
    });
    const story = computeMatchStory({
      log,
      artifact: testArtifact({ ultBankDiff: 1 }),
      engagements: [
        engagement(100, 101, "Bravo", { Bravo: 1 }),
        engagement(120, 130, "Bravo", { Bravo: 1 }),
      ],
      assists: [],
    })!;
    const second = story.fights[1];
    // Entering fight 2: Alpha bank 0, Bravo bank 2 → ultBankDiff −2.
    // Counterfactual neutral economy → sigmoid(0). Carryover = wp(−2) − 0.5 < 0.
    expect(second.carryover).not.toBeNull();
    expect(second.carryover!.ultEconomy).toBeLessThan(-0.2);
    expect(second.ultsSpentTeam1).toBe(0); // spend was in fight 1's window
    expect(story.fights[0].ultsSpentTeam1).toBe(1);
  });

  test("fights separated by more than the cascade window inherit nothing", () => {
    const log = baseLog({
      ultCharged: [{ time: 10, team: "Alpha", player: "a1" }],
      kills: [
        { time: 50, victimTeam: "Alpha", victimName: "a1", attackerTeam: "Bravo", attackerName: "b1" },
        { time: 150, victimTeam: "Bravo", victimName: "b1", attackerTeam: "Alpha", attackerName: "a1" },
      ],
    });
    const story = computeMatchStory({
      log,
      artifact: testArtifact({ aliveDiff: 1 }),
      engagements: [
        engagement(50, 50, "Bravo", { Bravo: 1 }),
        engagement(150, 150, "Alpha", { Alpha: 1 }),
      ],
      assists: [],
    })!;
    expect(story.fights[1].carryover).toBeNull();
  });

  test("limited logs (no ult events) suppress carryover entirely", () => {
    const log = baseLog({
      kills: [
        { time: 100, victimTeam: "Alpha", victimName: "a1", attackerTeam: "Bravo", attackerName: "b1" },
      ],
    });
    const story = computeMatchStory({
      log,
      artifact: testArtifact({ aliveDiff: 1 }),
      engagements: [
        engagement(100, 100, "Bravo", { Bravo: 1 }),
        engagement(110, 115, "Bravo", { Bravo: 1 }),
      ],
      assists: [],
    })!;
    expect(story.limited).toBe(true);
    expect(story.fights[1].carryover).toBeNull();
  });
});

describe("computeMatchStory — WPA", () => {
  test("each side's shares sum to its signed swing; final blows outweigh assists", () => {
    const log = baseLog({
      kills: [
        { time: 100, victimTeam: "Alpha", victimName: "a1", attackerTeam: "Bravo", attackerName: "b1" },
        { time: 102, victimTeam: "Alpha", victimName: "a2", attackerTeam: "Bravo", attackerName: "b2" },
      ],
    });
    const story = computeMatchStory({
      log,
      artifact: testArtifact({ aliveDiff: 1 }),
      engagements: [engagement(100, 102, "Bravo", { Bravo: 2 })],
      assists: [{ time: 101, team: "Bravo", player: "b3" }],
    })!;
    const [fight] = story.fights;
    const byPlayer = new Map(story.wpa.map((p) => [p.player, p]));

    // Bravo (winning side): b1, b2 one final blow each (1.0), b3 one assist (0.5).
    const bravoTotal =
      byPlayer.get("b1")!.wpa + byPlayer.get("b2")!.wpa + byPlayer.get("b3")!.wpa;
    expect(bravoTotal).toBeCloseTo(-fight.swing, 5);
    expect(byPlayer.get("b1")!.wpa).toBeCloseTo(byPlayer.get("b2")!.wpa, 5);
    expect(byPlayer.get("b1")!.wpa).toBeGreaterThan(byPlayer.get("b3")!.wpa);

    // Alpha (losing side): a1 died first (weight 2), a2 second (weight 1).
    const a1 = byPlayer.get("a1")!;
    const a2 = byPlayer.get("a2")!;
    expect(a1.wpa + a2.wpa).toBeCloseTo(fight.swing, 5);
    expect(a1.wpa).toBeLessThan(a2.wpa); // first death carries more blame
    expect(a1.byFight[0].fightIndex).toBe(0);
  });

  test("a side with no attributable events leaves its swing unattributed", () => {
    // Bravo wins on enemy ult-overspend with zero Bravo events in the log.
    const log = baseLog({
      ultCharged: [{ time: 50, team: "Alpha", player: "a1" }],
      ultStart: [{ time: 100, team: "Alpha", player: "a1" }],
    });
    const story = computeMatchStory({
      log,
      artifact: testArtifact({ ultBankDiff: 1 }),
      engagements: [engagement(100, 105, "Bravo", {})],
      assists: [],
    })!;
    const [fight] = story.fights;
    expect(fight.unattributedSwing).not.toBe(0);
    const bravoPlayers = story.wpa.filter((p) => p.team === "Bravo");
    expect(bravoPlayers).toHaveLength(0);
  });
});

describe("computeMatchStory — engagement fallback", () => {
  test("synthesizes fights from kill clusters when no spatial engagements exist", () => {
    const log = baseLog({
      kills: [
        { time: 100, victimTeam: "Alpha", victimName: "a1", attackerTeam: "Bravo", attackerName: "b1" },
        { time: 104, victimTeam: "Alpha", victimName: "a2", attackerTeam: "Bravo", attackerName: "b2" },
        // 15s+ gap → second fight
        { time: 150, victimTeam: "Bravo", victimName: "b1", attackerTeam: "Alpha", attackerName: "a1" },
      ],
    });
    const story = computeMatchStory({
      log,
      artifact: testArtifact({ aliveDiff: 1 }),
      engagements: [], // no positional data
      assists: [],
    })!;
    expect(story.fights).toHaveLength(2);
    expect(story.fights[0].winner).toBe("Bravo");
    expect(story.fights[0].killsTeam2).toBe(2);
    expect(story.fights[0].zoneName).toBeNull();
    expect(story.fights[1].winner).toBe("Alpha");
    expect(story.wpa.length).toBeGreaterThan(0);
  });
});

describe("computeMatchStory — insights", () => {
  test("emits a biggest-swing insight and a cascade insight above threshold", () => {
    const log = baseLog({
      ultCharged: [
        { time: 50, team: "Bravo", player: "b1" },
        { time: 52, team: "Bravo", player: "b2" },
        { time: 54, team: "Alpha", player: "a1" },
      ],
      ultStart: [{ time: 100, team: "Alpha", player: "a1" }],
      kills: [
        { time: 101, victimTeam: "Alpha", victimName: "a1", attackerTeam: "Bravo", attackerName: "b1" },
        { time: 103, victimTeam: "Alpha", victimName: "a2", attackerTeam: "Bravo", attackerName: "b1" },
      ],
    });
    const story = computeMatchStory({
      log,
      artifact: testArtifact({ aliveDiff: 0.6, ultBankDiff: 0.8 }),
      engagements: [
        engagement(100, 103, "Bravo", { Bravo: 2 }),
        engagement(125, 135, "Bravo", { Bravo: 1 }),
      ],
      assists: [],
    })!;
    const keys = story.insights.map((i) => i.key);
    expect(keys).toContain("insights.biggestSwing");
    expect(keys).toContain("insights.ultCarryover");
    expect(story.insights.length).toBeLessThanOrEqual(6);
    // The story reads chronologically.
    const ts = story.insights.map((i) => i.t);
    expect([...ts].sort((a, b) => a - b)).toEqual(ts);
    const swing = story.insights.find((i) => i.key === "insights.biggestSwing")!;
    expect(swing.values.fight).toBe(1); // 1-based for display
    expect(swing.fightIndex).toBe(0);
    expect(typeof swing.values.swing).toBe("number");
  });

  test("narrates the arc: streak, closing, and standout player", () => {
    // Bravo wins 4 straight fights and the round; b1 racks up the WPA.
    const kills = [0, 1, 2, 3].map((i) => ({
      time: 40 + i * 30,
      victimTeam: "Alpha",
      victimName: `a${i + 1}`,
      attackerTeam: "Bravo",
      attackerName: "b1",
    }));
    const log = baseLog({
      mapWinner: null,
      rounds: [
        {
          roundNumber: 1,
          start: 0,
          end: 200,
          capturingTeam: "Alpha",
          startScore1: 0,
          startScore2: 0,
          endScore1: 0,
          endScore2: 1, // Bravo takes the round
        },
      ],
      kills,
    });
    const story = computeMatchStory({
      log,
      artifact: testArtifact({ aliveDiff: 1 }),
      engagements: kills.map((k) =>
        engagement(k.time, k.time + 5, "Bravo", { Bravo: 1 })
      ),
      assists: [],
    })!;
    const keys = story.insights.map((i) => i.key);
    expect(keys).toContain("insights.winStreak");
    expect(keys).toContain("insights.closing");
    expect(keys).toContain("insights.topWpa");
    const streak = story.insights.find((i) => i.key === "insights.winStreak")!;
    expect(streak.values.team).toBe("Bravo");
    expect(streak.values.count).toBe(4);
    const closing = story.insights.find((i) => i.key === "insights.closing")!;
    expect(closing.values.team).toBe("Bravo");
    const top = story.insights.find((i) => i.key === "insights.topWpa")!;
    expect(top.values.player).toBe("b1");
    // earlyControl is suppressed when the streak already opens the story.
    expect(keys).not.toContain("insights.earlyControl");
  });

  test("limited logs (no ult events) emit no cascade insights", () => {
    const log = baseLog({
      kills: [
        { time: 100, victimTeam: "Alpha", victimName: "a1", attackerTeam: "Bravo", attackerName: "b1" },
      ],
    });
    const story = computeMatchStory({
      log,
      artifact: testArtifact({ aliveDiff: 1 }),
      engagements: [
        engagement(100, 100, "Bravo", { Bravo: 1 }),
        engagement(110, 115, "Bravo", { Bravo: 1 }),
      ],
      assists: [],
    })!;
    expect(
      story.insights.every((i) => i.key !== "insights.ultCarryover")
    ).toBe(true);
  });
});
