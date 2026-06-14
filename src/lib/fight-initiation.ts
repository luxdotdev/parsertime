import type { Kill, MercyRez } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { groupEventsIntoFights, mercyRezToKillEvent, round } from "@/lib/utils";
import type { Fight } from "@/lib/utils";

/** How far before a fight's first kill to scan for the opening commitment. */
export const INITIATION_LOOKBACK_SEC = 12;
/** Forward window from a candidate moment over which a team commit is measured. */
export const COMMIT_SUBWINDOW_SEC = 2.5;
/** Distinct attackers required for the multi-player damage path. Two captures dive
 * engages (Ball + Tracer) while still filtering lone spikes (one Widow headshot). */
export const MIN_COMMIT_PLAYERS = 2;
/** Cross-team damage volume (over the sub-window) required alongside the player floor.
 * Coupled with MIN_COMMIT_PLAYERS so a single big hit or idle poke cannot trip a commit.
 * Tune this first in the inspector. */
export const MIN_COMMIT_DAMAGE = 250;
/** Abilities fired together by a team that count as a hard commit. */
export const HARD_COMMIT_ABILITIES = 2;
/** Response gap (seconds) above which the initiator is cleanly separated → high conf. */
export const CLEAN_SEPARATION_SEC = 1.5;
/** Commits within this many seconds of each other are "simultaneous" → contested. */
export const TIE_TOLERANCE_SEC = 0.5;
/** Window after the initiator's commit over which reactive healing is compared. */
export const HEAL_CORROBORATION_WINDOW_SEC = 4;

/**
 * Absolute winner of a fight from its kill/rez events, or null for a draw. Mirrors the
 * kill-counting in analyzeFightOutcome (a Mercy rez undoes the opposing team's kill).
 */
export function determineFightWinner(
  kills: Kill[],
  teamA: string,
  teamB: string
): string | null {
  const sorted = [...kills].sort((x, y) => x.match_time - y.match_time);
  let a = 0;
  let b = 0;
  for (const e of sorted) {
    if (e.event_type === "mercy_rez") {
      if (e.victim_team === teamA) b = Math.max(0, b - 1);
      else if (e.victim_team === teamB) a = Math.max(0, a - 1);
    } else if (e.event_type === "kill") {
      if (e.attacker_team === teamA) a++;
      else if (e.attacker_team === teamB) b++;
    }
  }
  if (a > b) return teamA;
  if (b > a) return teamB;
  return null;
}

export type DamageEvent = {
  match_time: number;
  attacker_name: string;
  attacker_team: string;
  victim_name: string;
  victim_team: string;
  event_damage: number;
};

export type AbilityEvent = {
  match_time: number;
  player_name: string;
  player_team: string;
};

export type UltEvent = {
  match_time: number;
  player_name: string;
  player_team: string;
};

export type HealEvent = {
  match_time: number;
  healee_team: string;
  event_healing: number;
};

export type InitiationContext = {
  teams: [string, string];
  damage: DamageEvent[];
  ability1: AbilityEvent[];
  ability2: AbilityEvent[];
  ults: UltEvent[];
  healing: HealEvent[];
};

export type CommitSignal = {
  team: string;
  /** Earliest moment from which a full commitment materializes within the sub-window. */
  time: number;
  /** Distinct attackers of `team` dealing cross-team damage in the commit sub-window. */
  players: string[];
  /** Cross-team damage by `team` in the commit sub-window. */
  damage: number;
  usedUlt: boolean;
  abilityCommit: boolean;
};

function inWindow(t: number, from: number, to: number): boolean {
  return t >= from && t <= to;
}

/**
 * The earliest moment in [windowStart, windowEnd] at which `team` commits to a fight, or
 * null if it never does. A commit is either a multi-player damage burst (≥
 * MIN_COMMIT_PLAYERS distinct attackers AND ≥ MIN_COMMIT_DAMAGE volume) or a hard
 * resource commit (an offensive ult, or ≥ HARD_COMMIT_ABILITIES abilities together),
 * measured over a forward COMMIT_SUBWINDOW_SEC window. Candidate moments are the team's
 * own event times in the window — O(n^2) over per-fight counts, which is small.
 */
export function findTeamCommit(
  team: string,
  windowStart: number,
  windowEnd: number,
  ctx: InitiationContext
): CommitSignal | null {
  const teamDamage = ctx.damage.filter(
    (d) =>
      d.attacker_team === team &&
      d.victim_team !== team &&
      d.attacker_name !== d.victim_name
  );
  const teamAbilities = [...ctx.ability1, ...ctx.ability2].filter(
    (e) => e.player_team === team
  );
  const teamUlts = ctx.ults.filter((u) => u.player_team === team);

  const candidates = [
    ...teamDamage.map((d) => d.match_time),
    ...teamAbilities.map((e) => e.match_time),
    ...teamUlts.map((u) => u.match_time),
  ]
    .filter((t) => inWindow(t, windowStart, windowEnd))
    .sort((x, y) => x - y);

  // [t, t + COMMIT_SUBWINDOW_SEC] may extend a couple seconds past the first kill by design —
  // a commitment materializes over a window that straddles the fight boundary, so early-fight
  // damage from a pre-kill candidate moment legitimately counts toward that team's commit.
  for (const t of candidates) {
    const subEnd = t + COMMIT_SUBWINDOW_SEC;
    const dmgInSub = teamDamage.filter((d) =>
      inWindow(d.match_time, t, subEnd)
    );
    const players = Array.from(new Set(dmgInSub.map((d) => d.attacker_name)));
    const damage = dmgInSub.reduce((acc, d) => acc + d.event_damage, 0);
    const usedUlt = teamUlts.some((u) => inWindow(u.match_time, t, subEnd));
    const abilityCount = teamAbilities.filter((e) =>
      inWindow(e.match_time, t, subEnd)
    ).length;
    const abilityCommit = abilityCount >= HARD_COMMIT_ABILITIES;

    const multiPlayerBurst =
      players.length >= MIN_COMMIT_PLAYERS && damage >= MIN_COMMIT_DAMAGE;

    if (multiPlayerBurst || usedUlt || abilityCommit) {
      return { team, time: t, players, damage, usedUlt, abilityCommit };
    }
  }

  return null;
}

export type HealingVerdict = "corroborates" | "contradicts" | "neutral";

/**
 * Whether reactive healing agrees that `initiator` engaged on `nonInitiator`. The team
 * being committed on should soak healing first, so more healing on the non-initiator
 * corroborates; markedly more on the initiator's own side contradicts the label.
 */
export function healingSignal(
  initiator: string,
  nonInitiator: string,
  commitTime: number,
  healing: HealEvent[]
): HealingVerdict {
  const end = commitTime + HEAL_CORROBORATION_WINDOW_SEC;
  let healInit = 0;
  let healNon = 0;
  for (const h of healing) {
    if (h.match_time < commitTime || h.match_time > end) continue;
    if (h.healee_team === initiator) healInit += h.event_healing;
    else if (h.healee_team === nonInitiator) healNon += h.event_healing;
  }
  if (healNon > healInit * 1.2) return "corroborates";
  if (healInit > healNon * 1.5) return "contradicts";
  return "neutral";
}

export type InitiationConfidence = "high" | "medium" | "low";

export type FightInitiationLabel = {
  fightIndex: number;
  /** Fight start = first kill time. */
  start: number;
  /** Team that went first, or null when contested / undetermined. */
  initiator: string | null;
  contested: boolean;
  /** Absolute fight winner, or null for a draw. */
  winner: string | null;
  /** winner === initiator (null when there is no initiator or no winner). */
  initiatorWon: boolean | null;
  /** Team that scored the first kill (surfaces "went first, lost the opener"). */
  firstBloodTeam: string | null;
  confidence: InitiationConfidence;
  /** Seconds between the initiator's commit and the other team's response (null when only
   * one team committed or on fallback). */
  responseGap: number | null;
  evidence: {
    players: string[];
    damage: number;
    usedUlt: boolean;
    abilityCommit: boolean;
    healing: HealingVerdict;
    firstBloodTeam: string | null;
    /** True when labeled by first blood because no commitment was detected. */
    fallback: boolean;
  };
};

function firstBloodOf(fight: Fight): string | null {
  const firstKill = [...fight.kills]
    .sort((a, b) => a.match_time - b.match_time)
    .find((k) => k.event_type === "kill");
  return firstKill ? firstKill.attacker_team : null;
}

function gradeConfidence(
  signal: CommitSignal,
  responseGap: number | null,
  healing: HealingVerdict
): InitiationConfidence {
  if (healing === "contradicts") return "low";
  const separationOk =
    responseGap === null || responseGap >= CLEAN_SEPARATION_SEC;
  const corroborated =
    signal.usedUlt || signal.players.length >= 3 || healing === "corroborates";
  if (separationOk && corroborated) return "high";
  if (!separationOk && !corroborated) return "low";
  return "medium";
}

export function detectFightInitiation(
  fight: Fight,
  fightIndex: number,
  prevFightEnd: number,
  ctx: InitiationContext
): FightInitiationLabel {
  const [teamA, teamB] = ctx.teams;
  const windowStart = Math.max(
    prevFightEnd,
    fight.start - INITIATION_LOOKBACK_SEC
  );
  // Inclusive of fight.start: the opening burst that produces first blood is part of the commitment.
  const windowEnd = fight.start;

  const commitA = findTeamCommit(teamA, windowStart, windowEnd, ctx);
  const commitB = findTeamCommit(teamB, windowStart, windowEnd, ctx);

  const winner = determineFightWinner(fight.kills, teamA, teamB);
  const firstBloodTeam = firstBloodOf(fight);

  const base = {
    fightIndex,
    start: fight.start,
    winner,
    firstBloodTeam,
  };

  // No commitment detected → fall back to first blood at low confidence.
  if (!commitA && !commitB) {
    return {
      ...base,
      initiator: firstBloodTeam,
      contested: false,
      initiatorWon: firstBloodTeam ? winner === firstBloodTeam : null,
      confidence: "low",
      responseGap: null,
      evidence: {
        players: [],
        damage: 0,
        usedUlt: false,
        abilityCommit: false,
        healing: "neutral",
        firstBloodTeam,
        fallback: true,
      },
    };
  }

  // Both committed within the tie tolerance → contested.
  if (
    commitA &&
    commitB &&
    Math.abs(commitA.time - commitB.time) <= TIE_TOLERANCE_SEC
  ) {
    return {
      ...base,
      initiator: null,
      contested: true,
      initiatorWon: null,
      confidence: "low",
      responseGap: Math.abs(commitA.time - commitB.time),
      evidence: {
        players: [],
        damage: 0,
        usedUlt: false,
        abilityCommit: false,
        healing: "neutral",
        firstBloodTeam,
        fallback: false,
      },
    };
  }

  // Exactly one, or one clearly earlier → that team initiated.
  const earlier =
    commitA && (!commitB || commitA.time < commitB.time) ? commitA : commitB!;
  const other = earlier === commitA ? commitB : commitA;
  const initiator = earlier.team;
  const nonInitiator = initiator === teamA ? teamB : teamA;
  const responseGap = other ? other.time - earlier.time : null;
  const healing = healingSignal(
    initiator,
    nonInitiator,
    earlier.time,
    ctx.healing
  );

  return {
    ...base,
    initiator,
    contested: false,
    initiatorWon: winner ? winner === initiator : null,
    confidence: gradeConfidence(earlier, responseGap, healing),
    responseGap,
    evidence: {
      players: earlier.players,
      damage: round(earlier.damage),
      usedUlt: earlier.usedUlt,
      abilityCommit: earlier.abilityCommit,
      healing,
      firstBloodTeam,
      fallback: false,
    },
  };
}

export type TeamInitiationSummary = {
  initiations: number;
  initiationWins: number;
  initiationWinrate: number; // 0-100
};

export type MapInitiationSummary = {
  teams: [string, string];
  totalFights: number;
  labeledFights: number;
  contestedFights: number;
  byTeam: Record<string, TeamInitiationSummary>;
};

export type RoundEventInput = { match_time: number; round_number: number };

/** A collapsed round-boundary marker for the initiation timeline. */
export type RoundBoundaryMarker = {
  kind: "first" | "change" | "last";
  match_time: number;
  /** "first": the opening round; "change": the round being entered; "last": the closing round. */
  round_number: number;
  /** For "change", the round that just ended; null otherwise. */
  previous_round: number | null;
};

export function buildRoundBoundaryMarkers(
  roundStarts: RoundEventInput[],
  roundEnds: RoundEventInput[]
): RoundBoundaryMarker[] {
  // De-duplicate starts: earliest match_time per round_number, ordered by round_number.
  const startByRound = new Map<number, number>();
  for (const s of roundStarts) {
    const existing = startByRound.get(s.round_number);
    if (existing === undefined || s.match_time < existing) {
      startByRound.set(s.round_number, s.match_time);
    }
  }
  const uniqueStarts = Array.from(
    startByRound,
    ([round_number, match_time]) => ({
      round_number,
      match_time,
    })
  ).sort((a, b) => a.round_number - b.round_number);

  const markers: RoundBoundaryMarker[] = [];
  uniqueStarts.forEach((s, i) => {
    if (i === 0) {
      markers.push({
        kind: "first",
        match_time: s.match_time,
        round_number: s.round_number,
        previous_round: null,
      });
    } else {
      markers.push({
        kind: "change",
        match_time: s.match_time,
        round_number: s.round_number,
        previous_round: uniqueStarts[i - 1].round_number,
      });
    }
  });

  if (roundEnds.length > 0) {
    const last = roundEnds.reduce((a, b) =>
      b.match_time > a.match_time ? b : a
    );
    markers.push({
      kind: "last",
      match_time: last.match_time,
      round_number: last.round_number,
      previous_round: null,
    });
  }

  return markers.sort((a, b) => a.match_time - b.match_time);
}

export type MapInitiationResult = {
  /** False when the map lacks the granular events this stat requires. */
  available: boolean;
  labels: FightInitiationLabel[];
  summary: MapInitiationSummary | null;
  rounds: RoundBoundaryMarker[];
};

export type AssembleInput = {
  kills: Kill[];
  rezzes: MercyRez[];
  damage: DamageEvent[];
  ability1: AbilityEvent[];
  ability2: AbilityEvent[];
  ults: UltEvent[];
  healing: HealEvent[];
  roundStarts: RoundEventInput[];
  roundEnds: RoundEventInput[];
};

/** The two teams present in a map's kill events, or null if fewer than two are found. */
function deriveTeams(kills: Kill[]): [string, string] | null {
  const seen: string[] = [];
  for (const k of kills) {
    if (k.event_type !== "kill") continue;
    for (const team of [k.attacker_team, k.victim_team]) {
      if (team && !seen.includes(team)) seen.push(team);
    }
    if (seen.length >= 2) break;
  }
  const first = seen[0];
  const second = seen[1];
  if (!first || !second) return null;
  return [first, second];
}

export function summarizeMapInitiation(
  labels: FightInitiationLabel[],
  teams: [string, string]
): MapInitiationSummary {
  const byTeam: Record<string, TeamInitiationSummary> = {};
  for (const team of teams) {
    const mine = labels.filter((l) => l.initiator === team);
    const wins = mine.filter((l) => l.initiatorWon === true).length;
    byTeam[team] = {
      initiations: mine.length,
      initiationWins: wins,
      initiationWinrate:
        mine.length > 0 ? round((wins / mine.length) * 100) : 0,
    };
  }
  return {
    teams,
    totalFights: labels.length,
    labeledFights: labels.filter((l) => l.initiator !== null).length,
    contestedFights: labels.filter((l) => l.contested).length,
    byTeam,
  };
}

export function assembleMapInitiation(
  input: AssembleInput
): MapInitiationResult {
  if (input.damage.length === 0) {
    return { available: false, labels: [], summary: null, rounds: [] };
  }
  const teams = deriveTeams(input.kills);
  if (!teams) {
    return { available: false, labels: [], summary: null, rounds: [] };
  }

  const fightEvents = [
    ...input.kills,
    ...input.rezzes.map((r) => mercyRezToKillEvent(r)),
  ].sort((a, b) => a.match_time - b.match_time);
  const fights = groupEventsIntoFights(fightEvents);

  const ctx: InitiationContext = {
    teams,
    damage: input.damage,
    ability1: input.ability1,
    ability2: input.ability2,
    ults: input.ults,
    healing: input.healing,
  };

  const labels = fights.map((fight, i) =>
    detectFightInitiation(fight, i, i > 0 ? fights[i - 1].end : -Infinity, ctx)
  );

  return {
    available: true,
    labels,
    summary: summarizeMapInitiation(labels, teams),
    rounds: buildRoundBoundaryMarkers(input.roundStarts, input.roundEnds),
  };
}

/**
 * Load a map's events and label fight initiation. Returns { available: false } when the
 * map predates the granular workshop-log format (no damage rows).
 */
export async function getFightInitiationForMapData(
  mapDataId: number
): Promise<MapInitiationResult> {
  // Most cheaply gate on damage presence — one count avoids five large reads on legacy maps.
  const damageCount = await prisma.damage.count({
    where: { MapDataId: mapDataId },
  });
  if (damageCount === 0) {
    return { available: false, labels: [], summary: null, rounds: [] };
  }

  const [
    kills,
    rezzes,
    damage,
    ability1,
    ability2,
    ults,
    healing,
    roundStarts,
    roundEnds,
  ] = await Promise.all([
    prisma.kill.findMany({ where: { MapDataId: mapDataId } }),
    prisma.mercyRez.findMany({ where: { MapDataId: mapDataId } }),
    prisma.damage.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        attacker_name: true,
        attacker_team: true,
        victim_name: true,
        victim_team: true,
        event_damage: true,
      },
    }),
    prisma.ability1Used.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, player_name: true, player_team: true },
    }),
    prisma.ability2Used.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, player_name: true, player_team: true },
    }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, player_name: true, player_team: true },
    }),
    prisma.healing.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        healee_team: true,
        event_healing: true,
      },
    }),
    prisma.roundStart.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, round_number: true },
    }),
    prisma.roundEnd.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, round_number: true },
    }),
  ]);

  return assembleMapInitiation({
    kills,
    rezzes,
    damage,
    ability1,
    ability2,
    ults,
    healing,
    roundStarts,
    roundEnds,
  });
}
