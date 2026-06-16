import { extractFeatures } from "./features";
import { statesAt } from "./game-state";
import { type ModelArtifact, predictWinProbability } from "./model";
import { roundLabels } from "./training/extract";
import { CASCADE_MIN_WP, type GameState, type WPEventLog } from "./types";
import type { UltInstance } from "@/lib/ult-quality";

export const SERIES_INTERVAL_SECONDS = 5;
export const CASCADE_WINDOW_SECONDS = 60;
export const ULT_WINDOW_LEAD_SECONDS = 3;
export { CASCADE_MIN_WP } from "./types";
const EDGE_EPSILON = 0.5;

export type WpPoint = {
  t: number;
  wp: number;
  /** Terminal round-outcome point: rendered as a dot, excluded from the line. */
  snap?: boolean;
  /** State context for tooltips (team1 perspective). */
  scoreDiff?: number;
  objOwn?: number;
  objEnemy?: number;
};

/** An objective event worth annotating on the curve (capture / point flip). */
export type ObjectiveMarker = {
  t: number;
  team: string;
  /** Both teams' control win % at the flip (raw 0..100), so the marker can
   * show the point progress that grounds the WP move. */
  progress1: number;
  progress2: number;
};

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
  ults: UltInstance[];
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
  /** The swing split by what changed across the fight (ablation: each group's
   * contribution is the WP lost when that group's state is reset to its
   * before-fight values, normalized so the parts sum to the swing). */
  drivers: { objective: number; kills: number; ults: number };
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
  /** Chronological anchor: beats are ordered by map time, not priority. */
  t: number;
  /** Fight to focus when the beat is clicked, when one applies. */
  fightIndex?: number;
};

export type FightUlt = {
  hero: string;
  value: "value" | "none" | "died" | "unknown";
  kills: number;
};

export type ReasonTag =
  | { key: "primaryDriver"; group: "objective" | "kills" | "ults" }
  | { key: "earlyFirstDeath"; player: string; t: number }
  | { key: "stagger"; cost: number }
  | { key: "ultDeficit"; cost: number };

export type MissedOpportunity = {
  fightIndex: number;
  start: number;
  zoneName: string | null;
  wpBefore: number;
  wpAfter: number;
  swing: number;
  reasons: ReasonTag[];
  ults: FightUlt[];
};

export type MissedOpportunities = {
  items: MissedOpportunity[];
  total: number;
};

export type MatchStoryData = {
  teams: { team1: string; team2: string };
  points: WpPoint[];
  objectiveMarkers: ObjectiveMarker[];
  roundMarkers: number[];
  fights: FightEntry[];
  wpa: PlayerWpa[];
  insights: MatchStoryInsight[];
  /** Coaching prescriptions for team 1 (the viewing team), each citing the
   * fights it was detected from. */
  takeaways: MatchStoryInsight[];
  missedOpportunities: MissedOpportunities;
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

  const points = computeSeries(log, wpOf);
  const engagements =
    inputs.engagements.length > 0
      ? inputs.engagements
      : synthesizeEngagements(log);
  const fights = buildLedger({ ...inputs, engagements }, wpAt, wpOf, limited);
  const wpa = attributeWpa(inputs, fights);
  const insights = generateStory(log, fights, points, wpa, limited);
  const takeaways = generateTakeaways(log, fights, limited);

  // Captures and point flips — the score/objective changes that drive the
  // biggest WP moves, surfaced so the curve's shifts have visible causes.
  const objectiveMarkers: ObjectiveMarker[] = log.objectiveCaptured
    .filter((o) => o.team === log.team1 || o.team === log.team2)
    .map((o) => ({
      t: o.time,
      team: o.team,
      progress1: o.progress1,
      progress2: o.progress2,
    }));

  return {
    teams: { team1: log.team1, team2: log.team2 },
    points,
    objectiveMarkers,
    roundMarkers: log.rounds.map((r) => r.start),
    fights,
    wpa,
    insights,
    takeaways,
    missedOpportunities: generateMissedOpportunities(log, fights, inputs.ults),
    limited,
  };
}

const MAX_TAKEAWAYS = 4;
const LOSS_SWING_FLOOR = -0.02;
const CARRY_TAKEAWAY_FLOOR = 0.02;
const FAVORED_WP = 0.55;
const BLED_WP_SWING = -0.1;
const EARLY_DEATH_SECONDS = 4;
const MAX_MISSED = 5;
const FIRST_DEATH_MIN = 3;
const LOSS_PROFILE_SHARE = 0.45;

function fightList(fights: FightEntry[]): string {
  return fights.map((f) => `#${f.index + 1}`).join(", ");
}

/** Recurring, fixable patterns in team 1's losses — each one cites the
 * fights it was detected from and carries an estimated WP cost. */
function generateTakeaways(
  log: WPEventLog,
  fights: FightEntry[],
  limited: boolean
): MatchStoryInsight[] {
  const takeaways: (MatchStoryInsight & { cost: number })[] = [];
  const losses = fights.filter((f) => f.swing <= LOSS_SWING_FLOOR);

  // The loss profile: where team 1's lost win probability actually came
  // from, using the exact per-fight driver decomposition.
  if (losses.length >= 2) {
    const sums = { objective: 0, kills: 0, ults: 0 };
    for (const fight of losses) {
      sums.objective += Math.min(0, fight.drivers.objective);
      sums.kills += Math.min(0, fight.drivers.kills);
      sums.ults += Math.min(0, fight.drivers.ults);
    }
    const total = -(sums.objective + sums.kills + sums.ults);
    if (total > 0) {
      const dominant = (["objective", "kills", "ults"] as const).reduce(
        (a, b) => (sums[a] <= sums[b] ? a : b) // most negative
      );
      const share = -sums[dominant] / total;
      if (share >= LOSS_PROFILE_SHARE) {
        takeaways.push({
          key: {
            objective: "takeaways.lossProfileObjective",
            kills: "takeaways.lossProfileKills",
            ults: "takeaways.lossProfileUlts",
          }[dominant],
          values: { pct: Math.round(share * 100), count: losses.length },
          priority: 95,
          t: losses[0].start,
          fightIndex: losses[0].index,
          cost: total, // headline: sorts by everything it explains
        });
      }
    }
  }

  // Ult overspend: lost fights where team 1 burned more ults than the enemy.
  if (!limited) {
    const overspends = losses.filter(
      (f) => f.ultsSpentTeam1 - f.ultsSpentTeam2 >= 2
    );
    if (overspends.length > 0) {
      const extra = overspends.reduce(
        (a, f) => a + (f.ultsSpentTeam1 - f.ultsSpentTeam2),
        0
      );
      const cost = overspends.reduce((a, f) => a + Math.abs(f.swing), 0);
      takeaways.push({
        key: "takeaways.ultDiscipline",
        values: {
          extra,
          count: overspends.length,
          fights: fightList(overspends),
        },
        priority: 90,
        t: overspends[0].start,
        fightIndex: overspends[0].index,
        cost,
      });
    }

    // Stagger bleed: fights entered down players from the previous fight.
    const staggered = fights.filter(
      (f) =>
        f.carryover !== null && f.carryover.stagger <= -CARRY_TAKEAWAY_FLOOR
    );
    if (staggered.length > 0) {
      const cost = staggered.reduce(
        (a, f) => a + Math.abs(f.carryover!.stagger),
        0
      );
      takeaways.push({
        key: "takeaways.staggers",
        values: {
          count: staggered.length,
          cost: Math.round(cost * 100),
          fights: fightList(staggered),
        },
        priority: 85,
        t: staggered[0].start,
        fightIndex: staggered[0].index,
        cost,
      });
    }

    // Ult-economy deficit: fights taken while down on banked ults.
    const deficits = losses.filter(
      (f) =>
        f.carryover !== null && f.carryover.ultEconomy <= -CARRY_TAKEAWAY_FLOOR
    );
    if (deficits.length > 0) {
      const cost = deficits.reduce(
        (a, f) => a + Math.abs(f.carryover!.ultEconomy),
        0
      );
      takeaways.push({
        key: "takeaways.ultDeficit",
        values: {
          count: deficits.length,
          cost: Math.round(cost * 100),
          fights: fightList(deficits),
        },
        priority: 80,
        t: deficits[0].start,
        fightIndex: deficits[0].index,
        cost,
      });
    }
  }

  // Recurring first deaths in lost fights.
  if (losses.length >= FIRST_DEATH_MIN) {
    const firstDeaths = new Map<string, FightEntry[]>();
    for (const fight of losses) {
      const first = [...log.kills]
        .sort((a, b) => a.time - b.time)
        .find(
          (k) =>
            k.victimTeam === log.team1 &&
            k.time >= fight.start - ULT_WINDOW_LEAD_SECONDS &&
            k.time <= fight.end + EDGE_EPSILON
        );
      if (first === undefined) continue;
      const list = firstDeaths.get(first.victimName) ?? [];
      list.push(fight);
      firstDeaths.set(first.victimName, list);
    }
    for (const [player, playerFights] of firstDeaths) {
      if (
        playerFights.length >= FIRST_DEATH_MIN &&
        playerFights.length * 2 >= losses.length
      ) {
        const cost = playerFights.reduce((a, f) => a + Math.abs(f.swing), 0);
        takeaways.push({
          key: "takeaways.firstDeaths",
          values: {
            player,
            count: playerFights.length,
            of: losses.length,
            fights: fightList(playerFights),
          },
          priority: 88,
          t: playerFights[0].start,
          fightIndex: playerFights[0].index,
          cost,
        });
      }
    }
  }

  return takeaways
    .sort((a, b) => b.cost - a.cost)
    .slice(0, MAX_TAKEAWAYS)
    .map(({ cost: _cost, ...beat }) => beat);
}

function missedReasons(log: WPEventLog, fight: FightEntry): ReasonTag[] {
  const reasons: ReasonTag[] = [];
  const dominant = (["objective", "kills", "ults"] as const).reduce((a, b) =>
    fight.drivers[a] <= fight.drivers[b] ? a : b
  );
  if (fight.drivers[dominant] < 0)
    reasons.push({ key: "primaryDriver", group: dominant });
  const firstKill = [...log.kills]
    .filter(
      (k) =>
        k.time >= fight.start - ULT_WINDOW_LEAD_SECONDS &&
        k.time <= fight.end + EDGE_EPSILON
    )
    .sort((a, b) => a.time - b.time)[0];
  if (
    firstKill !== undefined &&
    firstKill.victimTeam === log.team1 &&
    firstKill.time - fight.start <= EARLY_DEATH_SECONDS
  ) {
    reasons.push({
      key: "earlyFirstDeath",
      player: firstKill.victimName,
      t: firstKill.time,
    });
  }
  if (
    fight.carryover !== null &&
    fight.carryover.stagger <= -CARRY_TAKEAWAY_FLOOR
  ) {
    reasons.push({
      key: "stagger",
      cost: Math.round(Math.abs(fight.carryover.stagger) * 100),
    });
  }
  if (
    fight.carryover !== null &&
    fight.carryover.ultEconomy <= -CARRY_TAKEAWAY_FLOOR
  ) {
    reasons.push({
      key: "ultDeficit",
      cost: Math.round(Math.abs(fight.carryover.ultEconomy) * 100),
    });
  }
  return reasons;
}

function bucketUlt(u: UltInstance): FightUlt {
  let value: FightUlt["value"];
  if (u.conversionKills === null) value = "unknown";
  else if (u.conversionKills > 0) value = "value";
  else if (u.diedDuringUlt) value = "died";
  else value = "none";
  return { hero: u.hero, value, kills: u.conversionKills ?? 0 };
}

function fightUlts(
  log: WPEventLog,
  ults: UltInstance[],
  fight: FightEntry
): FightUlt[] {
  return ults
    .filter(
      (u) =>
        u.playerTeam === log.team1 &&
        u.startTime >= fight.start - ULT_WINDOW_LEAD_SECONDS &&
        u.startTime <= fight.end + EDGE_EPSILON
    )
    .sort((a, b) => a.startTime - b.startTime)
    .map(bucketUlt);
}

function toMissed(
  log: WPEventLog,
  fight: FightEntry,
  ults: UltInstance[]
): MissedOpportunity {
  return {
    fightIndex: fight.index,
    start: fight.start,
    zoneName: fight.zoneName,
    wpBefore: fight.wpBefore,
    wpAfter: fight.wpAfter,
    swing: fight.swing,
    reasons: missedReasons(log, fight),
    ults: fightUlts(log, ults, fight),
  };
}

export function generateMissedOpportunities(
  log: WPEventLog,
  fights: FightEntry[],
  ults: UltInstance[]
): MissedOpportunities {
  const candidates = fights
    .filter((f) => f.wpBefore >= FAVORED_WP && f.swing <= BLED_WP_SWING)
    .sort((a, b) => a.swing - b.swing);
  return {
    items: candidates.slice(0, MAX_MISSED).map((f) => toMissed(log, f, ults)),
    total: candidates.length,
  };
}

function computeSeries(
  log: WPEventLog,
  wpOf: (state: GameState) => number
): WpPoint[] {
  const labels = roundLabels(log);
  const points: WpPoint[] = [];
  for (const round of log.rounds) {
    const times: number[] = [];
    for (let t = round.start; t < round.end; t += SERIES_INTERVAL_SECONDS) {
      times.push(t);
    }
    const snapshots = statesAt(log, times);
    for (let i = 0; i < times.length; i++) {
      const state = snapshots[i].team1;
      points.push({
        t: times[i],
        wp: wpOf(state),
        scoreDiff: state.scoreDiff,
        objOwn: state.objProgressOwn,
        objEnemy: state.objProgressEnemy,
      });
    }
    const winner = labels.get(round.roundNumber);
    // The curve always terminates at the outcome (1/0); unlabeled rounds
    // (non-control ties) end on the model's last word instead. Snap points
    // render as outcome dots, never as part of the line.
    const endState = statesAt(log, [round.end])[0].team1;
    points.push({
      t: round.end,
      wp:
        winner === undefined || winner === null
          ? wpOf(endState)
          : winner === log.team1
            ? 1
            : 0,
      snap: winner !== undefined && winner !== null,
    });
  }
  return points;
}

const SYNTH_FIGHT_GAP_SECONDS = 15;

const DRIVER_FIELDS: Record<
  "objective" | "kills" | "ults",
  (keyof GameState)[]
> = {
  kills: ["aliveDiff", "tankAliveDiff", "dpsAliveDiff", "supportAliveDiff"],
  ults: ["ultBankDiff", "tankUltDiff", "dpsUltDiff", "supportUltDiff"],
  objective: [
    "scoreDiff",
    "objProgressOwn",
    "objProgressEnemy",
    "controlProgressOwn",
    "controlProgressEnemy",
    "holdsObjective",
    "objectiveIndex",
  ],
};

/** Attribute a fight's WP swing to driver groups by ablation: per group, reset
 * that group's GameState fields in `after` to their `before` values and
 * re-score; the WP it loses is that group's contribution, normalized onto the
 * actual swing so the parts sum to it. Model-agnostic (LR and GBM). */
export function decomposeSwing(
  wpOf: (state: GameState) => number,
  before: GameState,
  after: GameState,
  swing: number
): FightEntry["drivers"] {
  const wpAfter = wpOf(after);
  const contrib = { objective: 0, kills: 0, ults: 0 };
  for (const group of ["objective", "kills", "ults"] as const) {
    const hybrid: GameState = { ...after };
    for (const field of DRIVER_FIELDS[group]) {
      (hybrid[field] as number) = before[field] as number;
    }
    contrib[group] = wpAfter - wpOf(hybrid);
  }
  const total = contrib.objective + contrib.kills + contrib.ults;
  if (Math.abs(total) < 1e-9) return { objective: 0, kills: 0, ults: 0 };
  return {
    objective: (swing * contrib.objective) / total,
    kills: (swing * contrib.kills) / total,
    ults: (swing * contrib.ults) / total,
  };
}

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
    const stateBefore = statesAt(log, [fight.start - EDGE_EPSILON])[0].team1;
    const stateAfter = statesAt(log, [fight.end + EDGE_EPSILON])[0].team1;
    const wpBefore = wpOf(stateBefore);
    const wpAfter = wpOf(stateAfter);
    const drivers = decomposeSwing(
      wpOf,
      stateBefore,
      stateAfter,
      wpAfter - wpBefore
    );

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
      const entry = stateBefore;
      const actual = wpBefore;
      carryover = {
        ultEconomy:
          actual -
          wpOf({
            ...entry,
            ultBankDiff: 0,
            tankUltDiff: 0,
            dpsUltDiff: 0,
            supportUltDiff: 0,
          }),
        stagger:
          actual -
          wpOf({
            ...entry,
            aliveDiff: 0,
            tankAliveDiff: 0,
            dpsAliveDiff: 0,
            supportAliveDiff: 0,
          }),
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
      drivers,
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
const MAX_STORY_BEATS = 6;
const STRETCH_MIN_SECONDS = 120;
const STRETCH_WP_EDGE = 0.6;
const STREAK_MIN_FIGHTS = 3;
const TOP_WPA_FLOOR = 0.04;

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** The arc of the map as chronological beats: who took early control, the
 * defining stretch, the turning point, momentum runs, cascades, how it
 * closed, and the standout player. */
function generateStory(
  log: WPEventLog,
  fights: FightEntry[],
  points: WpPoint[],
  wpa: PlayerWpa[],
  limited: boolean
): MatchStoryInsight[] {
  const beats: MatchStoryInsight[] = [];
  function pct(v: number): number {
    return Math.round(Math.abs(v) * 100);
  }

  // Longest run of consecutive fight wins by one team.
  let streak: {
    team: string;
    from: FightEntry;
    to: FightEntry;
    count: number;
  } | null = null;
  {
    let run: {
      team: string;
      from: FightEntry;
      to: FightEntry;
      count: number;
    } | null = null;
    for (const fight of fights) {
      if (fight.winner === null) continue;
      if (run === null || run.team !== fight.winner) {
        run = { team: fight.winner, from: fight, to: fight, count: 1 };
      } else {
        run.to = fight;
        run.count++;
      }
      if (
        run.count >= STREAK_MIN_FIGHTS &&
        (streak === null || run.count > streak.count)
      ) {
        streak = { ...run };
      }
    }
  }
  if (streak !== null) {
    beats.push({
      key: "insights.winStreak",
      values: {
        team: streak.team,
        count: streak.count,
        from: clock(streak.from.start),
        to: clock(streak.to.start),
      },
      priority: 80,
      t: streak.from.start,
      fightIndex: streak.from.index,
    });
  }

  // Early control — unless the streak already starts the story there.
  const opening = fights.slice(0, 4);
  if (opening.length >= 3 && (streak === null || streak.from.index > 1)) {
    const wins: Record<string, number> = {};
    for (const fight of opening) {
      if (fight.winner !== null)
        wins[fight.winner] = (wins[fight.winner] ?? 0) + 1;
    }
    for (const team of [log.team1, log.team2]) {
      if ((wins[team] ?? 0) >= opening.length - 1) {
        beats.push({
          key: "insights.earlyControl",
          values: { team, wins: wins[team], of: opening.length },
          priority: 70,
          t: opening[0].start,
          fightIndex: opening[0].index,
        });
      }
    }
  }

  // The defining stretch: longest span one team held a clear WP edge.
  {
    let best: {
      team: string;
      start: number;
      end: number;
      peak: number;
    } | null = null;
    let run: { team: string; start: number; end: number; peak: number } | null =
      null;
    for (const point of points) {
      if (point.snap) continue;
      const team =
        point.wp >= STRETCH_WP_EDGE
          ? log.team1
          : point.wp <= 1 - STRETCH_WP_EDGE
            ? log.team2
            : null;
      if (team === null) {
        run = null;
        continue;
      }
      const edge = team === log.team1 ? point.wp : 1 - point.wp;
      if (run === null || run.team !== team) {
        run = { team, start: point.t, end: point.t, peak: edge };
      } else {
        run.end = point.t;
        run.peak = Math.max(run.peak, edge);
      }
      if (
        run.end - run.start >= STRETCH_MIN_SECONDS &&
        (best === null || run.end - run.start > best.end - best.start)
      ) {
        best = { ...run };
      }
    }
    if (best !== null) {
      beats.push({
        key: "insights.longStretch",
        values: {
          team: best.team,
          duration: clock(best.end - best.start),
          pct: pct(best.peak),
        },
        priority: 75,
        t: best.start,
      });
    }
  }

  // The turning point: biggest single swing.
  let biggest: FightEntry | null = null;
  for (const fight of fights) {
    if (biggest === null || Math.abs(fight.swing) > Math.abs(biggest.swing)) {
      biggest = fight;
    }
  }
  if (biggest !== null && Math.abs(biggest.swing) >= CASCADE_MIN_WP) {
    // Name the dominant driver so the "why" is in the sentence — the
    // ablation decomposition is model-agnostic, not model-specific.
    const drivers = biggest.drivers;
    const dominant = (["objective", "kills", "ults"] as const).reduce((a, b) =>
      Math.abs(drivers[a]) >= Math.abs(drivers[b]) ? a : b
    );
    const dominantShare = Math.abs(drivers[dominant]) / Math.abs(biggest.swing);
    const key =
      dominantShare >= 0.4
        ? {
            objective: "insights.biggestSwingObjective",
            kills: "insights.biggestSwingKills",
            ults: "insights.biggestSwingUlts",
          }[dominant]
        : "insights.biggestSwing";
    beats.push({
      key,
      values: {
        fight: biggest.index + 1,
        swing: pct(biggest.swing),
        team: biggest.swing > 0 ? log.team1 : log.team2,
      },
      priority: 90,
      t: biggest.start,
      fightIndex: biggest.index,
    });
  }

  // Cascades worth narrating.
  if (!limited) {
    for (const fight of fights) {
      if (fight.carryover === null) continue;
      if (Math.abs(fight.carryover.ultEconomy) >= CASCADE_MIN_WP) {
        beats.push({
          key: "insights.ultCarryover",
          values: {
            fight: fight.index + 1,
            prevFight: fight.index, // 1-based previous fight
            cost: pct(fight.carryover.ultEconomy),
            team: fight.carryover.ultEconomy < 0 ? log.team1 : log.team2,
          },
          priority: 80,
          t: fight.start,
          fightIndex: fight.index,
        });
      }
      if (Math.abs(fight.carryover.stagger) >= CASCADE_MIN_WP) {
        beats.push({
          key: "insights.staggerCarryover",
          values: {
            fight: fight.index + 1,
            cost: pct(fight.carryover.stagger),
            team: fight.carryover.stagger < 0 ? log.team1 : log.team2,
          },
          priority: 75,
          t: fight.start,
          fightIndex: fight.index,
        });
      }
    }
  }

  // The close: map outcome plus the late-fight record.
  const finalSnap = [...points].reverse().find((p) => p.snap);
  if (finalSnap !== undefined && fights.length >= 2) {
    const winner = finalSnap.wp === 1 ? log.team1 : log.team2;
    const closing = fights.slice(-4);
    const wins = closing.filter((f) => f.winner === winner).length;
    beats.push({
      key: "insights.closing",
      values: { team: winner, wins, of: closing.length },
      priority: 85,
      t: finalSnap.t,
    });
  }

  // The standout player, as a coda.
  const top = wpa[0];
  const lastT = points[points.length - 1]?.t ?? 0;
  if (top !== undefined && Math.abs(top.wpa) >= TOP_WPA_FLOOR) {
    beats.push({
      key: "insights.topWpa",
      values: { player: top.player, team: top.team, wpa: pct(top.wpa) },
      priority: 65,
      t: lastT + 1,
    });
  }

  // Chronological narrative; drop the least important beats when over cap.
  const kept = [...beats]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_STORY_BEATS);
  return kept.sort((a, b) => a.t - b.t);
}
