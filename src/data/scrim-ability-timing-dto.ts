import "server-only";

import { getTeamRoster } from "@/data/team-shared-data";
import prisma from "@/lib/prisma";
import {
  groupEventsIntoFights,
  mercyRezToKillEvent,
  removeDuplicateRows,
  type Fight,
} from "@/lib/utils";
import type { AbilityImpact } from "@/types/heroes";
import { allHeroes } from "@/types/heroes";
import { cache } from "react";

export type FightPhase = "pre-fight" | "early" | "mid" | "late" | "cleanup";

export type AbilityPhaseStats = {
  fights: number;
  wins: number;
  losses: number;
  winrate: number;
};

export type AbilityTimingRow = {
  heroName: string;
  abilityName: string;
  abilitySlot: 1 | 2;
  impactRating: "high" | "critical";
  phases: Record<FightPhase, AbilityPhaseStats>;
  overallWinrate: number;
  totalFights: number;
};

export type AbilityTimingOutlier = {
  heroName: string;
  abilityName: string;
  phase: FightPhase;
  phaseWinrate: number;
  overallWinrate: number;
  deviation: number;
  bestPhase: FightPhase;
  bestPhaseWinrate: number;
  type: "positive" | "negative";
};

export type AbilityTimingAnalysis = {
  rows: AbilityTimingRow[];
  outliers: AbilityTimingOutlier[];
};

type AbilityDef = {
  name: string;
  impact: AbilityImpact;
};

const heroAbilityLookup = new Map<
  string,
  { ability1: AbilityDef; ability2: AbilityDef }
>();
for (const hero of allHeroes) {
  heroAbilityLookup.set(hero.name, {
    ability1: { name: hero.ability1.name, impact: hero.ability1.impact },
    ability2: { name: hero.ability2.name, impact: hero.ability2.impact },
  });
}

function isHighImpact(impact: AbilityImpact): boolean {
  return impact === "high" || impact === "critical";
}

const PRE_FIGHT_BUFFER = 5;
const CLEANUP_BUFFER = 2;

function classifyPhase(abilityTime: number, fight: Fight): FightPhase | null {
  const fightStart = fight.start;
  const fightEnd = fight.end;
  const duration = fightEnd - fightStart;

  if (
    abilityTime < fightStart - PRE_FIGHT_BUFFER ||
    abilityTime > fightEnd + CLEANUP_BUFFER
  ) {
    return null;
  }

  if (abilityTime < fightStart) {
    return "pre-fight";
  }

  if (abilityTime > fightEnd) {
    return "cleanup";
  }

  if (duration < 4) {
    return "mid";
  }

  const elapsed = abilityTime - fightStart;
  const progress = elapsed / duration;

  if (progress <= 0.25) return "early";
  if (progress <= 0.75) return "mid";
  return "late";
}

function assignToFight(
  abilityTime: number,
  fights: Fight[]
): { fight: Fight; phase: FightPhase } | null {
  let bestMatch: { fight: Fight; phase: FightPhase; distance: number } | null =
    null;

  for (const fight of fights) {
    const phase = classifyPhase(abilityTime, fight);
    if (phase === null) continue;

    const fightCenter = (fight.start + fight.end) / 2;
    const distance = Math.abs(abilityTime - fightCenter);

    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = { fight, phase, distance };
    }
  }

  return bestMatch ? { fight: bestMatch.fight, phase: bestMatch.phase } : null;
}

function determineFightOutcome(
  fight: Fight,
  ourTeamName: string
): "win" | "loss" {
  let ourKills = 0;
  let enemyKills = 0;

  for (const event of fight.kills) {
    if (event.event_type === ("mercy_rez" as string)) {
      if (event.victim_team === ourTeamName) {
        enemyKills = Math.max(0, enemyKills - 1);
      } else {
        ourKills = Math.max(0, ourKills - 1);
      }
    } else if (event.event_type === "kill") {
      if (event.attacker_team === ourTeamName) ourKills++;
      else enemyKills++;
    }
  }

  return ourKills > enemyKills ? "win" : "loss";
}

type AbilityEvent = {
  match_time: number;
  player_team: string;
  player_hero: string;
  MapDataId: number | null;
};

function emptyPhaseStats(): AbilityPhaseStats {
  return { fights: 0, wins: 0, losses: 0, winrate: 0 };
}

function emptyPhases(): Record<FightPhase, AbilityPhaseStats> {
  return {
    "pre-fight": emptyPhaseStats(),
    early: emptyPhaseStats(),
    mid: emptyPhaseStats(),
    late: emptyPhaseStats(),
    cleanup: emptyPhaseStats(),
  };
}

const PHASE_ORDER: FightPhase[] = [
  "pre-fight",
  "early",
  "mid",
  "late",
  "cleanup",
];

const MIN_FIGHTS_FOR_DISPLAY = 3;
const OUTLIER_THRESHOLD_PP = 15;

function processAbilityTimingAnalysis(
  fights: Fight[],
  ability1Events: AbilityEvent[],
  ability2Events: AbilityEvent[],
  ourTeamName: string
): AbilityTimingAnalysis {
  if (fights.length === 0) {
    return { rows: [], outliers: [] };
  }

  const fightOutcomes = new Map<Fight, "win" | "loss">();
  for (const fight of fights) {
    fightOutcomes.set(fight, determineFightOutcome(fight, ourTeamName));
  }

  type AccumKey = string;
  const accum = new Map<
    AccumKey,
    {
      heroName: string;
      abilityName: string;
      abilitySlot: 1 | 2;
      impactRating: "high" | "critical";
      fightPhaseUsage: Map<Fight, Set<FightPhase>>;
    }
  >();

  function processEvents(events: AbilityEvent[], slot: 1 | 2) {
    for (const event of events) {
      if (event.player_team !== ourTeamName) continue;

      const heroDef = heroAbilityLookup.get(event.player_hero);
      if (!heroDef) continue;

      const abilityDef = slot === 1 ? heroDef.ability1 : heroDef.ability2;
      if (!isHighImpact(abilityDef.impact)) continue;

      const match = assignToFight(event.match_time, fights);
      if (!match) continue;

      const key = `${event.player_hero}|${slot}`;
      if (!accum.has(key)) {
        accum.set(key, {
          heroName: event.player_hero,
          abilityName: abilityDef.name,
          abilitySlot: slot,
          impactRating: abilityDef.impact as "high" | "critical",
          fightPhaseUsage: new Map(),
        });
      }

      const entry = accum.get(key)!;
      if (!entry.fightPhaseUsage.has(match.fight)) {
        entry.fightPhaseUsage.set(match.fight, new Set());
      }
      entry.fightPhaseUsage.get(match.fight)!.add(match.phase);
    }
  }

  processEvents(ability1Events, 1);
  processEvents(ability2Events, 2);

  const rows: AbilityTimingRow[] = [];

  for (const entry of accum.values()) {
    const phases = emptyPhases();
    let totalWins = 0;
    let totalFights = 0;

    for (const [fight, phasesUsed] of entry.fightPhaseUsage) {
      const outcome = fightOutcomes.get(fight)!;
      const won = outcome === "win";
      totalFights++;
      if (won) totalWins++;

      for (const phase of phasesUsed) {
        phases[phase].fights++;
        if (won) phases[phase].wins++;
        else phases[phase].losses++;
      }
    }

    for (const phase of PHASE_ORDER) {
      const s = phases[phase];
      s.winrate = s.fights > 0 ? (s.wins / s.fights) * 100 : 0;
    }

    if (totalFights === 0) continue;

    rows.push({
      heroName: entry.heroName,
      abilityName: entry.abilityName,
      abilitySlot: entry.abilitySlot,
      impactRating: entry.impactRating,
      phases,
      overallWinrate: (totalWins / totalFights) * 100,
      totalFights,
    });
  }

  rows.sort((a, b) => {
    if (a.impactRating !== b.impactRating) {
      return a.impactRating === "critical" ? -1 : 1;
    }
    return b.totalFights - a.totalFights;
  });

  const outliers: AbilityTimingOutlier[] = [];

  for (const row of rows) {
    let bestPhase: FightPhase = "mid";
    let bestWinrate = -1;

    for (const phase of PHASE_ORDER) {
      const s = row.phases[phase];
      if (s.fights >= MIN_FIGHTS_FOR_DISPLAY && s.winrate > bestWinrate) {
        bestWinrate = s.winrate;
        bestPhase = phase;
      }
    }

    for (const phase of PHASE_ORDER) {
      const s = row.phases[phase];
      if (s.fights < MIN_FIGHTS_FOR_DISPLAY) continue;

      const deviation = s.winrate - row.overallWinrate;
      if (Math.abs(deviation) < OUTLIER_THRESHOLD_PP) continue;

      outliers.push({
        heroName: row.heroName,
        abilityName: row.abilityName,
        phase,
        phaseWinrate: s.winrate,
        overallWinrate: row.overallWinrate,
        deviation,
        bestPhase,
        bestPhaseWinrate: bestWinrate,
        type: deviation < 0 ? "negative" : "positive",
      });
    }
  }

  outliers.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
  const topOutliers = outliers.slice(0, 3);

  return { rows, outliers: topOutliers };
}

async function getScrimAbilityTimingFn(
  scrimId: number,
  teamId: number
): Promise<AbilityTimingAnalysis> {
  const maps = await prisma.map.findMany({
    where: { scrimId },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (maps.length === 0) return { rows: [], outliers: [] };

  const mapIds = maps.map((m) => m.id);

  const [teamRosterArr, allKills, allRezzes, allAbility1, allAbility2] =
    await Promise.all([
      getTeamRoster(teamId),
      prisma.kill.findMany({
        where: { MapDataId: { in: mapIds } },
        orderBy: { match_time: "asc" },
      }),
      prisma.mercyRez.findMany({
        where: { MapDataId: { in: mapIds } },
        orderBy: { match_time: "asc" },
      }),
      prisma.ability1Used.findMany({
        where: { MapDataId: { in: mapIds } },
        select: {
          match_time: true,
          player_team: true,
          player_hero: true,
          MapDataId: true,
        },
        orderBy: { match_time: "asc" },
      }),
      prisma.ability2Used.findMany({
        where: { MapDataId: { in: mapIds } },
        select: {
          match_time: true,
          player_team: true,
          player_hero: true,
          MapDataId: true,
        },
        orderBy: { match_time: "asc" },
      }),
    ]);

  const teamRoster = new Set(teamRosterArr);

  const dedupedKills = removeDuplicateRows(allKills);
  const killEvents = [
    ...dedupedKills,
    ...allRezzes.map(mercyRezToKillEvent),
  ].sort((a, b) => a.match_time - b.match_time);

  const fights = groupEventsIntoFights(killEvents);

  if (fights.length === 0) return { rows: [], outliers: [] };

  let ourTeamName = "";
  for (const kill of dedupedKills) {
    if (teamRoster.has(kill.attacker_name)) {
      ourTeamName = kill.attacker_team;
      break;
    }
    if (kill.victim_name && teamRoster.has(kill.victim_name)) {
      ourTeamName = kill.victim_team;
      break;
    }
  }

  if (!ourTeamName) return { rows: [], outliers: [] };

  return processAbilityTimingAnalysis(
    fights,
    allAbility1,
    allAbility2,
    ourTeamName
  );
}

export const getScrimAbilityTiming = cache(getScrimAbilityTimingFn);

export type MapAbilityTimingAnalysis = {
  team1: AbilityTimingAnalysis;
  team2: AbilityTimingAnalysis;
};

async function getMapAbilityTimingFn(
  mapId: number,
  team1Name: string,
  team2Name: string
): Promise<MapAbilityTimingAnalysis> {
  const empty: MapAbilityTimingAnalysis = {
    team1: { rows: [], outliers: [] },
    team2: { rows: [], outliers: [] },
  };

  const [allKills, allRezzes, allAbility1, allAbility2] = await Promise.all([
    prisma.kill.findMany({
      where: { MapDataId: mapId },
      orderBy: { match_time: "asc" },
    }),
    prisma.mercyRez.findMany({
      where: { MapDataId: mapId },
      orderBy: { match_time: "asc" },
    }),
    prisma.ability1Used.findMany({
      where: { MapDataId: mapId },
      select: {
        match_time: true,
        player_team: true,
        player_hero: true,
        MapDataId: true,
      },
      orderBy: { match_time: "asc" },
    }),
    prisma.ability2Used.findMany({
      where: { MapDataId: mapId },
      select: {
        match_time: true,
        player_team: true,
        player_hero: true,
        MapDataId: true,
      },
      orderBy: { match_time: "asc" },
    }),
  ]);

  if (allAbility1.length === 0 && allAbility2.length === 0) {
    return empty;
  }

  const dedupedKills = removeDuplicateRows(allKills);
  const killEvents = [
    ...dedupedKills,
    ...allRezzes.map(mercyRezToKillEvent),
  ].sort((a, b) => a.match_time - b.match_time);

  const fights = groupEventsIntoFights(killEvents);

  if (fights.length === 0) return empty;

  // Note: fight outcomes are relative to the team passed as "ourTeamName",
  // so team2's analysis naturally inverts win/loss.
  const team1Analysis = processAbilityTimingAnalysis(
    fights,
    allAbility1,
    allAbility2,
    team1Name
  );
  const team2Analysis = processAbilityTimingAnalysis(
    fights,
    allAbility1,
    allAbility2,
    team2Name
  );

  return { team1: team1Analysis, team2: team2Analysis };
}

export const getMapAbilityTiming = cache(getMapAbilityTimingFn);
