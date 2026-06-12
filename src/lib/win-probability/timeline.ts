import { extractFeatures } from "./features";
import { statesAt } from "./game-state";
import { type ModelArtifact, predictWinProbability } from "./model";
import { roundLabels } from "./training/extract";
import type { GameState, WPEventLog } from "./types";

export const SERIES_INTERVAL_SECONDS = 5;
export const CASCADE_WINDOW_SECONDS = 60;
export const CASCADE_MIN_WP = 0.05;
export const ULT_WINDOW_LEAD_SECONDS = 3;
const EDGE_EPSILON = 0.5;

export type WpPoint = { t: number; wp: number };

export type EngagementLike = {
  start: number;
  end: number;
  zoneName: string | null;
  winner: string | null;
  killsByTeam: Record<string, number>;
  participants: string[];
};

export type AssistEvent = { time: number; team: string; player: string };

export type MatchStoryInputs = {
  log: WPEventLog;
  artifact: ModelArtifact;
  engagements: EngagementLike[];
  assists: AssistEvent[];
};

export type FightEntry = {
  index: number;
  start: number;
  end: number;
  zoneName: string | null;
  winner: string | null;
  killsTeam1: number;
  killsTeam2: number;
  ultsSpentTeam1: number;
  ultsSpentTeam2: number;
  wpBefore: number;
  wpAfter: number;
  swing: number; // team1 perspective
  carryover: { ultEconomy: number; stagger: number } | null;
  unattributedSwing: number;
};

export type PlayerWpa = {
  player: string;
  team: string;
  wpa: number;
  byFight: { fightIndex: number; share: number }[];
};

export type MatchStoryInsight = {
  key: string;
  values: Record<string, string | number>;
  priority: number;
};

export type MatchStoryData = {
  teams: { team1: string; team2: string };
  points: WpPoint[];
  roundMarkers: number[];
  fights: FightEntry[];
  wpa: PlayerWpa[];
  insights: MatchStoryInsight[];
  limited: boolean;
};

/** Returns null when the artifact has no model for this log's mode family. */
export function computeMatchStory(
  inputs: MatchStoryInputs
): MatchStoryData | null {
  const { log, artifact } = inputs;
  if (artifact.modeFamilies[log.modeFamily] === null) return null;
  const limited = log.ultCharged.length === 0;

  function wpOf(state: GameState): number {
    return predictWinProbability(
      artifact,
      log.modeFamily,
      extractFeatures(state)
    )!;
  }
  function wpAt(t: number): number {
    return wpOf(statesAt(log, [t])[0].team1);
  }

  const points = computeSeries(log, wpAt);
  const fights = buildLedger(inputs, wpAt, wpOf, limited);
  const wpa = attributeWpa();
  const insights = generateInsights();

  return {
    teams: { team1: log.team1, team2: log.team2 },
    points,
    roundMarkers: log.rounds.map((r) => r.start),
    fights,
    wpa,
    insights,
    limited,
  };
}

function computeSeries(
  log: WPEventLog,
  wpAt: (t: number) => number
): WpPoint[] {
  const labels = roundLabels(log);
  const points: WpPoint[] = [];
  for (const round of log.rounds) {
    for (let t = round.start; t < round.end; t += SERIES_INTERVAL_SECONDS) {
      points.push({ t, wp: wpAt(t) });
    }
    const winner = labels.get(round.roundNumber);
    // The curve always terminates at the outcome (1/0); unlabeled rounds
    // (non-control ties) end on the model's last word instead.
    points.push({
      t: round.end,
      wp:
        winner === undefined || winner === null
          ? wpAt(round.end)
          : winner === log.team1
            ? 1
            : 0,
    });
  }
  return points;
}

function buildLedger(
  inputs: MatchStoryInputs,
  wpAt: (t: number) => number,
  wpOf: (state: GameState) => number,
  limited: boolean
): FightEntry[] {
  const { log, engagements } = inputs;
  const sorted = [...engagements].sort((a, b) => a.start - b.start);
  const entries: FightEntry[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const fight = sorted[i];
    const wpBefore = wpAt(fight.start - EDGE_EPSILON);
    const wpAfter = wpAt(fight.end + EDGE_EPSILON);

    function inWindow(t: number): boolean {
      return t >= fight.start - ULT_WINDOW_LEAD_SECONDS && t <= fight.end;
    }
    const ultsSpentTeam1 = log.ultStart.filter(
      (u) => u.team === log.team1 && inWindow(u.time)
    ).length;
    const ultsSpentTeam2 = log.ultStart.filter(
      (u) => u.team === log.team2 && inWindow(u.time)
    ).length;

    const previous = sorted[i - 1];
    let carryover: FightEntry["carryover"] = null;
    if (
      !limited &&
      previous !== undefined &&
      fight.start - previous.end <= CASCADE_WINDOW_SECONDS
    ) {
      const entry = statesAt(log, [fight.start - EDGE_EPSILON])[0].team1;
      const actual = wpOf(entry);
      carryover = {
        ultEconomy: actual - wpOf({ ...entry, ultBankDiff: 0 }),
        stagger: actual - wpOf({ ...entry, aliveDiff: 0 }),
      };
    }

    entries.push({
      index: i,
      start: fight.start,
      end: fight.end,
      zoneName: fight.zoneName,
      winner: fight.winner,
      killsTeam1: fight.killsByTeam[log.team1] ?? 0,
      killsTeam2: fight.killsByTeam[log.team2] ?? 0,
      ultsSpentTeam1,
      ultsSpentTeam2,
      wpBefore,
      wpAfter,
      swing: wpAfter - wpBefore,
      carryover,
      unattributedSwing: 0, // set by attributeWpa
    });
  }
  return entries;
}

// Tasks 3–4 replace these stubs with WPA and insights.
function attributeWpa(): PlayerWpa[] {
  return [];
}
function generateInsights(): MatchStoryInsight[] {
  return [];
}
