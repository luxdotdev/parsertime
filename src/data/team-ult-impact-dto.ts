import "server-only";

import { cache } from "react";
import type { ExtendedTeamData, TeamDateRange } from "./team-shared-core";
import { findTeamNameForMapInMemory } from "./team-shared-core";
import { getExtendedTeamData } from "./team-shared-data";

export type ScenarioStats = {
  fights: number;
  wins: number;
  losses: number;
  winrate: number;
};

export type HeroUltImpact = {
  hero: string;
  totalFightsAnalyzed: number;
  scenarios: {
    uncontestedOurs: ScenarioStats;
    uncontestedTheirs: ScenarioStats;
    mirrorOursFirst: ScenarioStats;
    mirrorTheirsFirst: ScenarioStats;
  };
};

export type UltImpactAnalysis = {
  byHero: Record<string, HeroUltImpact>;
  availableHeroes: string[];
};

function emptyScenario(): ScenarioStats {
  return { fights: 0, wins: 0, losses: 0, winrate: 0 };
}

function finalizeScenario(s: ScenarioStats): ScenarioStats {
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
};

type Fight = {
  events: FightEvent[];
  start: number;
  end: number;
};

function processUltImpactAnalysis(
  sharedData: ExtendedTeamData
): UltImpactAnalysis {
  const {
    teamRosterSet,
    mapDataIds,
    allPlayerStats,
    allKills,
    allRezzes,
    allUltimates,
  } = sharedData;

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
  const ultsByMap = new Map<number, typeof allUltimates>();

  for (const kill of allKills) {
    if (kill.MapDataId) {
      if (!killsByMap.has(kill.MapDataId)) {
        killsByMap.set(kill.MapDataId, []);
      }
      killsByMap.get(kill.MapDataId)!.push(kill);
    }
  }

  for (const rez of allRezzes) {
    if (rez.MapDataId) {
      if (!rezzesByMap.has(rez.MapDataId)) {
        rezzesByMap.set(rez.MapDataId, []);
      }
      rezzesByMap.get(rez.MapDataId)!.push(rez);
    }
  }

  for (const ult of allUltimates) {
    if (ult.MapDataId) {
      if (!ultsByMap.has(ult.MapDataId)) {
        ultsByMap.set(ult.MapDataId, []);
      }
      ultsByMap.get(ult.MapDataId)!.push(ult);
    }
  }

  // Accumulate per-hero scenario counts
  const heroStats = new Map<
    string,
    {
      uncontestedOurs: ScenarioStats;
      uncontestedTheirs: ScenarioStats;
      mirrorOursFirst: ScenarioStats;
      mirrorTheirsFirst: ScenarioStats;
      totalFightsAnalyzed: number;
    }
  >();

  function getOrCreateHero(hero: string) {
    if (!heroStats.has(hero)) {
      heroStats.set(hero, {
        uncontestedOurs: emptyScenario(),
        uncontestedTheirs: emptyScenario(),
        mirrorOursFirst: emptyScenario(),
        mirrorTheirsFirst: emptyScenario(),
        totalFightsAnalyzed: 0,
      });
    }
    return heroStats.get(hero)!;
  }

  function incrementScenario(scenario: ScenarioStats, won: boolean) {
    scenario.fights++;
    if (won) {
      scenario.wins++;
    } else {
      scenario.losses++;
    }
  }

  for (const mapDataId of mapDataIds) {
    const ourTeamName = teamNameByMapId.get(mapDataId);
    if (!ourTeamName) continue;

    const kills = killsByMap.get(mapDataId) ?? [];
    const rezzes = rezzesByMap.get(mapDataId) ?? [];
    const ults = ultsByMap.get(mapDataId) ?? [];

    if (kills.length === 0 && rezzes.length === 0 && ults.length === 0) {
      continue;
    }

    // Build combined event array
    const events: FightEvent[] = [
      ...kills.map((k) => ({
        event_type: k.event_type,
        match_time: k.match_time,
        attacker_team: k.attacker_team,
        attacker_hero: k.attacker_hero,
        victim_team: k.victim_team,
      })),
      ...rezzes.map((rez) => ({
        event_type: "mercy_rez" as const,
        match_time: rez.match_time,
        attacker_team: rez.resurrecter_team,
        attacker_hero: rez.resurrecter_hero,
        victim_team: rez.resurrectee_team,
      })),
      ...ults.map((ult) => ({
        event_type: "ultimate_start" as const,
        match_time: ult.match_time,
        attacker_team: ult.player_team,
        attacker_hero: ult.player_hero,
      })),
    ];

    events.sort((a, b) => a.match_time - b.match_time);

    // Group into fights using 15s gap rule
    const fights: Fight[] = [];
    let currentFight: Fight | null = null;

    for (const event of events) {
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
          if (event.attacker_team === ourTeamName) {
            ourKills++;
          } else {
            enemyKills++;
          }
        }
      }

      const won = ourKills > enemyKills;

      // Collect ultimate_start events and group by hero
      const ultEvents = fight.events.filter(
        (e) => e.event_type === "ultimate_start"
      );

      // Build per-hero map: { ourUses, theirUses }
      const heroUltMap = new Map<
        string,
        { ourUses: FightEvent[]; theirUses: FightEvent[] }
      >();

      for (const ult of ultEvents) {
        const hero = ult.attacker_hero;
        if (!heroUltMap.has(hero)) {
          heroUltMap.set(hero, { ourUses: [], theirUses: [] });
        }
        const entry = heroUltMap.get(hero)!;
        if (ult.attacker_team === ourTeamName) {
          entry.ourUses.push(ult);
        } else {
          entry.theirUses.push(ult);
        }
      }

      // Classify each hero's scenario
      for (const [hero, { ourUses, theirUses }] of heroUltMap) {
        const stats = getOrCreateHero(hero);
        stats.totalFightsAnalyzed++;

        if (ourUses.length > 0 && theirUses.length === 0) {
          incrementScenario(stats.uncontestedOurs, won);
        } else if (ourUses.length === 0 && theirUses.length > 0) {
          incrementScenario(stats.uncontestedTheirs, won);
        } else if (ourUses.length > 0 && theirUses.length > 0) {
          const ourEarliest = Math.min(...ourUses.map((u) => u.match_time));
          const theirEarliest = Math.min(...theirUses.map((u) => u.match_time));
          if (ourEarliest <= theirEarliest) {
            incrementScenario(stats.mirrorOursFirst, won);
          } else {
            incrementScenario(stats.mirrorTheirsFirst, won);
          }
        }
      }
    }
  }

  // Build result
  const byHero: Record<string, HeroUltImpact> = {};
  for (const [hero, stats] of heroStats) {
    if (stats.totalFightsAnalyzed < 1) continue;
    byHero[hero] = {
      hero,
      totalFightsAnalyzed: stats.totalFightsAnalyzed,
      scenarios: {
        uncontestedOurs: finalizeScenario(stats.uncontestedOurs),
        uncontestedTheirs: finalizeScenario(stats.uncontestedTheirs),
        mirrorOursFirst: finalizeScenario(stats.mirrorOursFirst),
        mirrorTheirsFirst: finalizeScenario(stats.mirrorTheirsFirst),
      },
    };
  }

  const availableHeroes = Object.values(byHero)
    .sort((a, b) => b.totalFightsAnalyzed - a.totalFightsAnalyzed)
    .map((h) => h.hero);

  return { byHero, availableHeroes };
}

async function getTeamUltImpactUncached(
  teamId: number,
  dateRange?: TeamDateRange
): Promise<UltImpactAnalysis> {
  const sharedData = await getExtendedTeamData(teamId, { dateRange });
  return processUltImpactAnalysis(sharedData);
}

export const getTeamUltImpact = cache(getTeamUltImpactUncached);
