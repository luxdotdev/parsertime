import "server-only";

import prisma from "@/lib/prisma";
import { heroAbilityMapping } from "@/types/heroes";
import type { HeroName } from "@/types/heroes";
import { cache } from "react";
import type { ExtendedTeamData, TeamDateRange } from "./team-shared-core";
import { findTeamNameForMapInMemory } from "./team-shared-core";
import { getExtendedTeamData } from "./team-shared-data";

export type AbilityScenarioStats = {
  fights: number;
  wins: number;
  losses: number;
  winrate: number;
};

export type AbilityImpactData = {
  abilityName: string;
  totalFightsAnalyzed: number;
  scenarios: {
    usedByUs: AbilityScenarioStats;
    notUsedByUs: AbilityScenarioStats;
    usedByEnemy: AbilityScenarioStats;
    notUsedByEnemy: AbilityScenarioStats;
  };
};

export type HeroAbilityImpact = {
  hero: string;
  ability1: AbilityImpactData;
  ability2: AbilityImpactData;
};

export type AbilityImpactAnalysis = {
  byHero: Record<string, HeroAbilityImpact>;
  availableHeroes: string[];
};

function emptyScenario(): AbilityScenarioStats {
  return { fights: 0, wins: 0, losses: 0, winrate: 0 };
}

function finalizeScenario(s: AbilityScenarioStats): AbilityScenarioStats {
  return {
    ...s,
    winrate: s.fights > 0 ? (s.wins / s.fights) * 100 : 0,
  };
}

type FightEvent = {
  event_type: string;
  match_time: number;
  attacker_team: string;
  attacker_hero: string;
  victim_team?: string;
  victim_hero?: string;
};

type Fight = {
  events: FightEvent[];
  start: number;
  end: number;
};

type AbilityEvent = {
  match_time: number;
  player_team: string;
  player_hero: string;
  MapDataId: number | null;
};

/** Buffer in seconds before fight start to capture initiating abilities */
const ABILITY_PRE_BUFFER = 5;
/** Buffer in seconds after fight end to capture cleanup abilities */
const ABILITY_POST_BUFFER = 2;

function processAbilityImpactAnalysis(
  sharedData: ExtendedTeamData,
  allAbility1Events: AbilityEvent[],
  allAbility2Events: AbilityEvent[]
): AbilityImpactAnalysis {
  const { teamRosterSet, mapDataIds, allPlayerStats, allKills, allRezzes } =
    sharedData;

  if (mapDataIds.length === 0) {
    return { byHero: {}, availableHeroes: [] };
  }

  // Build team name lookup for each map
  const teamNameByMapId = new Map<number, string>();
  for (const mapDataId of mapDataIds) {
    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (teamName) {
      teamNameByMapId.set(mapDataId, teamName);
    }
  }

  // Group events by MapDataId
  const killsByMap = new Map<number, typeof allKills>();
  const rezzesByMap = new Map<number, typeof allRezzes>();
  const ab1ByMap = new Map<number, AbilityEvent[]>();
  const ab2ByMap = new Map<number, AbilityEvent[]>();

  for (const kill of allKills) {
    if (kill.MapDataId) {
      if (!killsByMap.has(kill.MapDataId)) killsByMap.set(kill.MapDataId, []);
      killsByMap.get(kill.MapDataId)!.push(kill);
    }
  }

  for (const rez of allRezzes) {
    if (rez.MapDataId) {
      if (!rezzesByMap.has(rez.MapDataId)) rezzesByMap.set(rez.MapDataId, []);
      rezzesByMap.get(rez.MapDataId)!.push(rez);
    }
  }

  for (const ab of allAbility1Events) {
    if (ab.MapDataId) {
      if (!ab1ByMap.has(ab.MapDataId)) ab1ByMap.set(ab.MapDataId, []);
      ab1ByMap.get(ab.MapDataId)!.push(ab);
    }
  }

  for (const ab of allAbility2Events) {
    if (ab.MapDataId) {
      if (!ab2ByMap.has(ab.MapDataId)) ab2ByMap.set(ab.MapDataId, []);
      ab2ByMap.get(ab.MapDataId)!.push(ab);
    }
  }

  // Accumulate per-hero stats
  type AbilitySlotAccum = {
    usedByUs: AbilityScenarioStats;
    notUsedByUs: AbilityScenarioStats;
    usedByEnemy: AbilityScenarioStats;
    notUsedByEnemy: AbilityScenarioStats;
    totalFightsAnalyzed: number;
  };

  type HeroAccum = {
    ability1: AbilitySlotAccum;
    ability2: AbilitySlotAccum;
  };

  const heroStats = new Map<string, HeroAccum>();

  function getOrCreateHero(hero: string): HeroAccum {
    if (!heroStats.has(hero)) {
      heroStats.set(hero, {
        ability1: {
          usedByUs: emptyScenario(),
          notUsedByUs: emptyScenario(),
          usedByEnemy: emptyScenario(),
          notUsedByEnemy: emptyScenario(),
          totalFightsAnalyzed: 0,
        },
        ability2: {
          usedByUs: emptyScenario(),
          notUsedByUs: emptyScenario(),
          usedByEnemy: emptyScenario(),
          notUsedByEnemy: emptyScenario(),
          totalFightsAnalyzed: 0,
        },
      });
    }
    return heroStats.get(hero)!;
  }

  function incrementScenario(scenario: AbilityScenarioStats, won: boolean) {
    scenario.fights++;
    if (won) scenario.wins++;
    else scenario.losses++;
  }

  for (const mapDataId of mapDataIds) {
    const ourTeamName = teamNameByMapId.get(mapDataId);
    if (!ourTeamName) continue;

    const kills = killsByMap.get(mapDataId) ?? [];
    const rezzes = rezzesByMap.get(mapDataId) ?? [];
    const ab1s = ab1ByMap.get(mapDataId) ?? [];
    const ab2s = ab2ByMap.get(mapDataId) ?? [];

    if (kills.length === 0 && rezzes.length === 0) continue;

    // Build fight events from kills and rezzes only
    const fightEvents: FightEvent[] = [
      ...kills.map((k) => ({
        event_type: k.event_type,
        match_time: k.match_time,
        attacker_team: k.attacker_team,
        attacker_hero: k.attacker_hero,
        victim_team: k.victim_team,
        victim_hero: k.victim_hero,
      })),
      ...rezzes.map((rez) => ({
        event_type: "mercy_rez" as const,
        match_time: rez.match_time,
        attacker_team: rez.resurrecter_team,
        attacker_hero: rez.resurrecter_hero,
        victim_team: rez.resurrectee_team,
        victim_hero: undefined,
      })),
    ];

    fightEvents.sort((a, b) => a.match_time - b.match_time);

    // Group into fights using 15s gap rule
    const fights: Fight[] = [];
    let currentFight: Fight | null = null;

    for (const event of fightEvents) {
      if (!currentFight || event.match_time - currentFight.end > 15) {
        currentFight = {
          events: [event],
          start: event.match_time,
          end: event.match_time,
        };
        fights.push(currentFight);
      } else {
        currentFight.events.push(event);
        currentFight.end = event.match_time;
      }
    }

    // Analyze each fight
    for (const fight of fights) {
      // Determine winner by kill differential
      let ourKills = 0;
      let enemyKills = 0;

      for (const event of fight.events) {
        if (event.event_type === "mercy_rez") {
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

      const won = ourKills > enemyKills;

      // Find heroes present in fight from kill events
      const heroPresence = new Map<
        string,
        { ourTeam: boolean; enemyTeam: boolean }
      >();

      function markPresence(hero: string, team: string) {
        if (!heroPresence.has(hero)) {
          heroPresence.set(hero, { ourTeam: false, enemyTeam: false });
        }
        const p = heroPresence.get(hero)!;
        if (team === ourTeamName) p.ourTeam = true;
        else p.enemyTeam = true;
      }

      for (const event of fight.events) {
        if (event.event_type === "kill" || event.event_type === "mercy_rez") {
          markPresence(event.attacker_hero, event.attacker_team);
          if (event.victim_hero && event.victim_team) {
            markPresence(event.victim_hero, event.victim_team);
          }
        }
      }

      // Find abilities used in fight window (with buffer)
      const windowStart = fight.start - ABILITY_PRE_BUFFER;
      const windowEnd = fight.end + ABILITY_POST_BUFFER;

      const fightAb1s = ab1s.filter(
        (a) => a.match_time >= windowStart && a.match_time <= windowEnd
      );
      const fightAb2s = ab2s.filter(
        (a) => a.match_time >= windowStart && a.match_time <= windowEnd
      );

      // Also mark heroes from ability events as present
      for (const ab of [...fightAb1s, ...fightAb2s]) {
        markPresence(ab.player_hero, ab.player_team);
      }

      // Build ability usage sets per team
      const ourAb1Heroes = new Set<string>();
      const ourAb2Heroes = new Set<string>();
      const enemyAb1Heroes = new Set<string>();
      const enemyAb2Heroes = new Set<string>();

      for (const ab of fightAb1s) {
        if (ab.player_team === ourTeamName) ourAb1Heroes.add(ab.player_hero);
        else enemyAb1Heroes.add(ab.player_hero);
      }

      for (const ab of fightAb2s) {
        if (ab.player_team === ourTeamName) ourAb2Heroes.add(ab.player_hero);
        else enemyAb2Heroes.add(ab.player_hero);
      }

      // Classify per hero
      for (const [hero, presence] of heroPresence) {
        const stats = getOrCreateHero(hero);

        if (presence.ourTeam) {
          stats.ability1.totalFightsAnalyzed++;
          if (ourAb1Heroes.has(hero)) {
            incrementScenario(stats.ability1.usedByUs, won);
          } else {
            incrementScenario(stats.ability1.notUsedByUs, won);
          }

          stats.ability2.totalFightsAnalyzed++;
          if (ourAb2Heroes.has(hero)) {
            incrementScenario(stats.ability2.usedByUs, won);
          } else {
            incrementScenario(stats.ability2.notUsedByUs, won);
          }
        }

        if (presence.enemyTeam) {
          if (enemyAb1Heroes.has(hero)) {
            incrementScenario(stats.ability1.usedByEnemy, won);
          } else {
            incrementScenario(stats.ability1.notUsedByEnemy, won);
          }

          if (enemyAb2Heroes.has(hero)) {
            incrementScenario(stats.ability2.usedByEnemy, won);
          } else {
            incrementScenario(stats.ability2.notUsedByEnemy, won);
          }
        }
      }
    }
  }

  // Build result
  const byHero: Record<string, HeroAbilityImpact> = {};

  for (const [hero, stats] of heroStats) {
    const totalFights = Math.max(
      stats.ability1.totalFightsAnalyzed,
      stats.ability2.totalFightsAnalyzed
    );
    if (totalFights < 1) continue;

    const abilities = heroAbilityMapping[hero as HeroName];
    if (!abilities) continue;

    byHero[hero] = {
      hero,
      ability1: {
        abilityName: abilities.ability1Name,
        totalFightsAnalyzed: stats.ability1.totalFightsAnalyzed,
        scenarios: {
          usedByUs: finalizeScenario(stats.ability1.usedByUs),
          notUsedByUs: finalizeScenario(stats.ability1.notUsedByUs),
          usedByEnemy: finalizeScenario(stats.ability1.usedByEnemy),
          notUsedByEnemy: finalizeScenario(stats.ability1.notUsedByEnemy),
        },
      },
      ability2: {
        abilityName: abilities.ability2Name,
        totalFightsAnalyzed: stats.ability2.totalFightsAnalyzed,
        scenarios: {
          usedByUs: finalizeScenario(stats.ability2.usedByUs),
          notUsedByUs: finalizeScenario(stats.ability2.notUsedByUs),
          usedByEnemy: finalizeScenario(stats.ability2.usedByEnemy),
          notUsedByEnemy: finalizeScenario(stats.ability2.notUsedByEnemy),
        },
      },
    };
  }

  const availableHeroes = Object.values(byHero)
    .sort((a, b) => {
      const aTotal = Math.max(
        a.ability1.totalFightsAnalyzed,
        a.ability2.totalFightsAnalyzed
      );
      const bTotal = Math.max(
        b.ability1.totalFightsAnalyzed,
        b.ability2.totalFightsAnalyzed
      );
      return bTotal - aTotal;
    })
    .map((h) => h.hero);

  return { byHero, availableHeroes };
}

async function getTeamAbilityImpactUncached(
  teamId: number,
  dateRange?: TeamDateRange
): Promise<AbilityImpactAnalysis> {
  const sharedData = await getExtendedTeamData(teamId, { dateRange });

  if (sharedData.mapDataIds.length === 0) {
    return { byHero: {}, availableHeroes: [] };
  }

  const [allAbility1Events, allAbility2Events] = await Promise.all([
    prisma.ability1Used.findMany({
      where: { MapDataId: { in: sharedData.mapDataIds } },
      select: {
        match_time: true,
        player_team: true,
        player_hero: true,
        MapDataId: true,
      },
      orderBy: { match_time: "asc" },
    }),
    prisma.ability2Used.findMany({
      where: { MapDataId: { in: sharedData.mapDataIds } },
      select: {
        match_time: true,
        player_team: true,
        player_hero: true,
        MapDataId: true,
      },
      orderBy: { match_time: "asc" },
    }),
  ]);

  return processAbilityImpactAnalysis(
    sharedData,
    allAbility1Events,
    allAbility2Events
  );
}

export const getTeamAbilityImpact = cache(getTeamAbilityImpactUncached);
