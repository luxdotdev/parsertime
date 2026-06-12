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

const engagement = (
  start: number,
  end: number,
  winner: string | null,
  kills: Record<string, number>
) => ({
  start,
  end,
  zoneName: "Point A",
  winner,
  killsByTeam: kills,
  participants: [] as string[],
});

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
    expect(story!.roundMarkers).toEqual([0]);
    expect(story!.limited).toBe(true); // no ult events in this log
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
