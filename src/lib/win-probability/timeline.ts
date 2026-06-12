import { extractFeatures } from "./features";
import { statesAt } from "./game-state";
import { type ModelArtifact, predictWinProbability } from "./model";
import { roundLabels } from "./training/extract";
import { CASCADE_MIN_WP, type GameState, type WPEventLog } from "./types";

export const SERIES_INTERVAL_SECONDS = 5;
export const CASCADE_WINDOW_SECONDS = 60;
export const ULT_WINDOW_LEAD_SECONDS = 3;
export { CASCADE_MIN_WP } from "./types";
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
  const engagements =
    inputs.engagements.length > 0
      ? inputs.engagements
      : synthesizeEngagements(log);
  const fights = buildLedger(
    { ...inputs, engagements },
    wpAt,
    wpOf,
    limited
  );
  const wpa = attributeWpa(inputs, fights);
  const insights = generateInsights(log, fights, limited);

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

const SYNTH_FIGHT_GAP_SECONDS = 15;

/** Kills-only fallback for logs without positional data: spatial engagement
 * clustering needs coordinates, but a time-gap cluster over the kill feed
 * still yields a usable fight ledger (no zone labels). */
function synthesizeEngagements(log: WPEventLog): EngagementLike[] {
  const sorted = [...log.kills].sort((a, b) => a.time - b.time);
  const fights: EngagementLike[] = [];
  for (const kill of sorted) {
    const last = fights[fights.length - 1];
    if (last !== undefined && kill.time - last.end <= SYNTH_FIGHT_GAP_SECONDS) {
      last.end = kill.time;
    } else {
      fights.push({
        start: kill.time,
        end: kill.time,
        zoneName: null,
        winner: null,
        killsByTeam: {},
        participants: [],
      });
    }
    const fight = fights[fights.length - 1];
    if (kill.attackerTeam !== undefined) {
      fight.killsByTeam[kill.attackerTeam] =
        (fight.killsByTeam[kill.attackerTeam] ?? 0) + 1;
    }
    for (const name of [kill.attackerName, kill.victimName]) {
      if (name !== undefined && !fight.participants.includes(name)) {
        fight.participants.push(name);
      }
    }
  }
  for (const fight of fights) {
    const k1 = fight.killsByTeam[log.team1] ?? 0;
    const k2 = fight.killsByTeam[log.team2] ?? 0;
    fight.winner = k1 > k2 ? log.team1 : k2 > k1 ? log.team2 : null;
  }
  return fights;
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

const WEIGHT_FINAL_BLOW = 1.0;
const WEIGHT_ASSIST = 0.5;
const WEIGHT_ULT_SPENT = 0.5;
const WEIGHT_FIRST_DEATH = 2.0;
const WEIGHT_DEATH = 1.0;

/**
 * Attribution by convention: the winning side splits its swing by
 * contribution (final blows, assists, ults), the losing side by fault
 * (deaths — first heaviest — and ults burned). Sides with no attributable
 * events leave their swing explicitly unattributed rather than inventing
 * an even split across unknown rosters.
 */
function attributeWpa(
  inputs: MatchStoryInputs,
  fights: FightEntry[]
): PlayerWpa[] {
  const { log, assists } = inputs;
  const totals = new Map<string, PlayerWpa>();

  function credit(
    team: string,
    player: string,
    fightIndex: number,
    share: number
  ): void {
    const id = `${team} ${player}`;
    const existing = totals.get(id) ?? { player, team, wpa: 0, byFight: [] };
    existing.wpa += share;
    existing.byFight.push({ fightIndex, share });
    totals.set(id, existing);
  }

  for (const fight of fights) {
    function inWindow(t: number): boolean {
      return (
        t >= fight.start - ULT_WINDOW_LEAD_SECONDS &&
        t <= fight.end + EDGE_EPSILON
      );
    }
    const kills = log.kills.filter((k) => inWindow(k.time));
    const fightAssists = assists.filter((a) => inWindow(a.time));
    const ults = log.ultStart.filter((u) => inWindow(u.time));

    for (const team of [log.team1, log.team2]) {
      const sideSwing = team === log.team1 ? fight.swing : -fight.swing;
      const weights = new Map<string, number>();
      function add(player: string, w: number): void {
        weights.set(player, (weights.get(player) ?? 0) + w);
      }

      if (sideSwing >= 0) {
        for (const k of kills) {
          if (k.attackerTeam === team && k.attackerName !== undefined) {
            add(k.attackerName, WEIGHT_FINAL_BLOW);
          }
        }
        for (const a of fightAssists) {
          if (a.team === team) add(a.player, WEIGHT_ASSIST);
        }
        for (const u of ults) {
          if (u.team === team) add(u.player, WEIGHT_ULT_SPENT);
        }
      } else {
        const deaths = kills.filter((k) => k.victimTeam === team);
        deaths.forEach((k, i) => {
          add(k.victimName, i === 0 ? WEIGHT_FIRST_DEATH : WEIGHT_DEATH);
        });
        for (const u of ults) {
          if (u.team === team) add(u.player, WEIGHT_ULT_SPENT);
        }
      }

      const total = [...weights.values()].reduce((a, b) => a + b, 0);
      if (total === 0) {
        fight.unattributedSwing += sideSwing;
        continue;
      }
      for (const [player, w] of weights) {
        credit(team, player, fight.index, sideSwing * (w / total));
      }
    }
  }

  return [...totals.values()].sort((a, b) => b.wpa - a.wpa);
}
const MAX_INSIGHTS = 4;

function generateInsights(
  log: WPEventLog,
  fights: FightEntry[],
  limited: boolean
): MatchStoryInsight[] {
  const insights: MatchStoryInsight[] = [];
  function pct(v: number): number {
    return Math.round(Math.abs(v) * 100);
  }

  let biggest: FightEntry | null = null;
  for (const fight of fights) {
    if (biggest === null || Math.abs(fight.swing) > Math.abs(biggest.swing)) {
      biggest = fight;
    }
  }
  if (biggest !== null && Math.abs(biggest.swing) >= CASCADE_MIN_WP) {
    insights.push({
      key: "insights.biggestSwing",
      values: {
        fight: biggest.index + 1,
        swing: pct(biggest.swing),
        team: biggest.swing > 0 ? log.team1 : log.team2,
      },
      priority: 90,
    });
  }

  if (!limited) {
    for (const fight of fights) {
      if (fight.carryover === null) continue;
      if (Math.abs(fight.carryover.ultEconomy) >= CASCADE_MIN_WP) {
        insights.push({
          key: "insights.ultCarryover",
          values: {
            fight: fight.index + 1,
            prevFight: fight.index, // 1-based previous fight
            cost: pct(fight.carryover.ultEconomy),
            team: fight.carryover.ultEconomy < 0 ? log.team1 : log.team2,
          },
          priority: 80,
        });
      }
      if (Math.abs(fight.carryover.stagger) >= CASCADE_MIN_WP) {
        insights.push({
          key: "insights.staggerCarryover",
          values: {
            fight: fight.index + 1,
            cost: pct(fight.carryover.stagger),
            team: fight.carryover.stagger < 0 ? log.team1 : log.team2,
          },
          priority: 75,
        });
      }
    }
  }

  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_INSIGHTS);
}
