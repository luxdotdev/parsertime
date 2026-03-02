import "server-only";

import prisma from "@/lib/prisma";
import type { Fight } from "@/lib/utils";
import { groupEventsIntoFights, mercyRezToKillEvent } from "@/lib/utils";
import type { RoleName, SubroleName } from "@/types/heroes";
import {
  getHeroRole,
  ROLE_SUBROLES,
  SUBROLE_DISPLAY_NAMES,
} from "@/types/heroes";
import type { Kill } from "@prisma/client";
import { cache } from "react";
import type { SubroleUltTiming } from "./scrim-overview-dto";
import {
  assignPlayersToSubroles,
  type PlayerUltSummary,
} from "./scrim-overview-dto";
import type { ExtendedTeamData } from "./team-shared-data";
import {
  findTeamNameForMapInMemory,
  getExtendedTeamData,
} from "./team-shared-data";

export type TeamUltRoleBreakdown = {
  role: RoleName;
  count: number;
  percentage: number;
  subroleTimings: SubroleUltTiming[];
};

export type PlayerUltRanking = {
  playerName: string;
  primaryHero: string;
  totalUltsUsed: number;
  mapsPlayed: number;
  ultsPerMap: number;
  topFightOpeningHero: string | null;
  fightOpeningCount: number;
};

export type FightOpeningHero = {
  hero: string;
  count: number;
};

export type TeamUltStats = {
  totalUltsUsed: number;
  totalUltsEarned: number;
  totalMaps: number;
  ultsPerMap: number;

  avgChargeTime: number;
  avgHoldTime: number;

  fightInitiationRate: number;
  fightInitiationCount: number;
  totalFightsWithUlts: number;
  topFightOpeningHeroes: FightOpeningHero[];

  roleBreakdown: TeamUltRoleBreakdown[];

  playerRankings: PlayerUltRanking[];
};

function emptyTeamUltStats(): TeamUltStats {
  return {
    totalUltsUsed: 0,
    totalUltsEarned: 0,
    totalMaps: 0,
    ultsPerMap: 0,
    avgChargeTime: 0,
    avgHoldTime: 0,
    fightInitiationRate: 0,
    fightInitiationCount: 0,
    totalFightsWithUlts: 0,
    topFightOpeningHeroes: [],
    roleBreakdown: [],
    playerRankings: [],
  };
}

function primaryHeroForPlayer(entry: PlayerUltSummary): string {
  let bestHero = "";
  let bestCount = 0;
  for (const [hero, count] of entry.heroCountMap) {
    if (count > bestCount) {
      bestCount = count;
      bestHero = hero;
    }
  }
  return bestHero;
}

type UltStartRecord = {
  player_team: string;
  player_name: string;
  player_hero: string;
  match_time: number;
  MapDataId: number | null;
};

type SubroleTimingAccum = {
  count: number;
  initiation: number;
  midfight: number;
  late: number;
};

function createSubroleTimingMap() {
  const roles: RoleName[] = ["Tank", "Damage", "Support"];
  const map = new Map<string, Map<SubroleName, SubroleTimingAccum>>();
  for (const role of roles) {
    const inner = new Map<SubroleName, SubroleTimingAccum>();
    for (const sr of ROLE_SUBROLES[role]) {
      inner.set(sr, { count: 0, initiation: 0, midfight: 0, late: 0 });
    }
    map.set(role, inner);
  }
  return map;
}

function extractTimings(
  timingMap: Map<string, Map<SubroleName, SubroleTimingAccum>>,
  role: RoleName
): SubroleUltTiming[] {
  const result: SubroleUltTiming[] = [];
  const inner = timingMap.get(role)!;
  for (const sr of ROLE_SUBROLES[role]) {
    const accum = inner.get(sr)!;
    if (accum.count > 0) {
      result.push({
        subrole: SUBROLE_DISPLAY_NAMES[sr],
        count: accum.count,
        initiation: accum.initiation,
        midfight: accum.midfight,
        late: accum.late,
      });
    }
  }
  return result;
}

async function getTeamUltStatsUncached(teamId: number): Promise<TeamUltStats> {
  const sharedData = await getExtendedTeamData(teamId);

  if (sharedData.mapDataIds.length === 0) {
    return emptyTeamUltStats();
  }

  const calculatedStats = await prisma.calculatedStat.findMany({
    where: {
      MapDataId: { in: sharedData.mapDataIds },
      stat: { in: ["AVERAGE_ULT_CHARGE_TIME", "AVERAGE_TIME_TO_USE_ULT"] },
    },
  });

  return processTeamUltStats(sharedData, calculatedStats);
}

type CalculatedStatRow = {
  playerName: string;
  stat: string;
  value: number;
};

function processTeamUltStats(
  sharedData: ExtendedTeamData,
  calculatedStats: CalculatedStatRow[]
): TeamUltStats {
  const {
    teamRosterSet,
    mapDataIds,
    allPlayerStats,
    allKills,
    allRezzes,
    allUltimates,
  } = sharedData;

  if (mapDataIds.length === 0) {
    return emptyTeamUltStats();
  }

  const roles: RoleName[] = ["Tank", "Damage", "Support"];

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

  // Aggregate ults earned/used from PlayerStat
  let totalUltsEarned = 0;
  for (const stat of allPlayerStats) {
    if (!stat.MapDataId) continue;
    const ourTeam = teamNameByMapId.get(stat.MapDataId);
    if (ourTeam && stat.player_team === ourTeam) {
      totalUltsEarned += stat.ultimates_earned;
    }
  }

  // Group events by map
  const killsByMap = new Map<number, Kill[]>();
  const ultsByMap = new Map<number, UltStartRecord[]>();

  for (const kill of allKills) {
    if (kill.MapDataId) {
      if (!killsByMap.has(kill.MapDataId)) killsByMap.set(kill.MapDataId, []);
      killsByMap.get(kill.MapDataId)!.push(kill);
    }
  }

  for (const rez of allRezzes) {
    if (rez.MapDataId) {
      if (!killsByMap.has(rez.MapDataId)) killsByMap.set(rez.MapDataId, []);
      killsByMap.get(rez.MapDataId)!.push(mercyRezToKillEvent(rez));
    }
  }

  for (const ult of allUltimates) {
    if (ult.MapDataId) {
      if (!ultsByMap.has(ult.MapDataId)) ultsByMap.set(ult.MapDataId, []);
      ultsByMap.get(ult.MapDataId)!.push(ult);
    }
  }

  // Per-player tracking
  const ourPlayerUltCounts = new Map<string, PlayerUltSummary>();
  const playerMapSets = new Map<string, Set<number>>();
  const playerFightOpenings = new Map<string, Map<string, number>>();

  function trackPlayerUlt(playerName: string, hero: string, mapDataId: number) {
    let entry = ourPlayerUltCounts.get(playerName);
    if (!entry) {
      entry = { heroCountMap: new Map(), totalCount: 0 };
      ourPlayerUltCounts.set(playerName, entry);
    }
    entry.totalCount++;
    entry.heroCountMap.set(hero, (entry.heroCountMap.get(hero) ?? 0) + 1);

    if (!playerMapSets.has(playerName)) {
      playerMapSets.set(playerName, new Set());
    }
    playerMapSets.get(playerName)!.add(mapDataId);
  }

  // Role counting
  const ultsByRole: Record<RoleName, number> = {
    Tank: 0,
    Damage: 0,
    Support: 0,
  };
  let totalOurUltsUsed = 0;

  // Fight initiation tracking
  const fightOpeningHeroCounts = new Map<string, number>();
  let fightInitiationCount = 0;
  let totalFightsWithUlts = 0;

  // Subrole timing
  const subroleTimingByRole = createSubroleTimingMap();

  // Pre-compute player ult counts for subrole assignment
  for (const [mapId, ults] of ultsByMap) {
    const ourTeamName = teamNameByMapId.get(mapId);
    if (!ourTeamName) continue;
    for (const ult of ults) {
      if (ult.player_team === ourTeamName) {
        trackPlayerUlt(ult.player_name, ult.player_hero, mapId);
      }
    }
  }

  const ourSubroleAssignment = assignPlayersToSubroles(ourPlayerUltCounts);
  const ourPlayerSubrole = new Map<string, SubroleName>();
  for (const [sr, candidate] of ourSubroleAssignment) {
    ourPlayerSubrole.set(candidate.playerName, sr);
  }

  // Process each map: count ults by role, classify timing, track fight openings
  for (const mapId of mapDataIds) {
    const ourTeamName = teamNameByMapId.get(mapId);
    if (!ourTeamName) continue;

    const mapUlts = ultsByMap.get(mapId) ?? [];
    const mapKills = killsByMap.get(mapId) ?? [];

    for (const ult of mapUlts) {
      if (ult.player_team === ourTeamName) {
        const role = getHeroRole(ult.player_hero);
        ultsByRole[role]++;
        totalOurUltsUsed++;
      }
    }

    if (mapKills.length === 0 && mapUlts.length === 0) continue;

    // Build combined event array for fight grouping
    const fightEvents: Kill[] = [
      ...mapKills,
      ...mapUlts.map((ult) => ({
        id: ult.MapDataId ?? 0,
        scrimId: 0,
        event_type: "ultimate_start" as Kill["event_type"],
        match_time: ult.match_time,
        attacker_team: ult.player_team,
        attacker_name: ult.player_name,
        attacker_hero: ult.player_hero,
        victim_team: "",
        victim_name: "",
        victim_hero: "",
        event_ability: "Ultimate",
        event_damage: 0,
        is_critical_hit: "0",
        is_environmental: "0",
        MapDataId: ult.MapDataId,
      })),
    ];

    fightEvents.sort((a, b) => a.match_time - b.match_time);
    const fights: Fight[] = groupEventsIntoFights(fightEvents);

    for (const fight of fights) {
      const fightUlts = mapUlts.filter(
        (u) => u.match_time >= fight.start && u.match_time <= fight.end + 15
      );

      if (fightUlts.length === 0) continue;

      totalFightsWithUlts++;
      const opener = fightUlts[0];
      if (opener.player_team === ourTeamName) {
        fightInitiationCount++;
        fightOpeningHeroCounts.set(
          opener.player_hero,
          (fightOpeningHeroCounts.get(opener.player_hero) ?? 0) + 1
        );

        if (!playerFightOpenings.has(opener.player_name)) {
          playerFightOpenings.set(opener.player_name, new Map());
        }
        const heroMap = playerFightOpenings.get(opener.player_name)!;
        heroMap.set(
          opener.player_hero,
          (heroMap.get(opener.player_hero) ?? 0) + 1
        );
      }

      // Classify ult timing within fight
      const fightDuration = fight.end + 15 - fight.start;
      const thirdDuration = fightDuration / 3;

      for (const ult of fightUlts) {
        if (ult.player_team !== ourTeamName) continue;
        const subrole = ourPlayerSubrole.get(ult.player_name);
        if (!subrole) continue;
        const role = getHeroRole(ult.player_hero);
        const accum = subroleTimingByRole.get(role)?.get(subrole);
        if (!accum) continue;

        accum.count++;
        const elapsed = ult.match_time - fight.start;
        if (fightDuration <= 0 || elapsed < thirdDuration) {
          accum.initiation++;
        } else if (elapsed < thirdDuration * 2) {
          accum.midfight++;
        } else {
          accum.late++;
        }
      }
    }
  }

  // Build role breakdown
  const roleBreakdown: TeamUltRoleBreakdown[] = roles.map((role) => ({
    role,
    count: ultsByRole[role],
    percentage:
      totalOurUltsUsed > 0 ? (ultsByRole[role] / totalOurUltsUsed) * 100 : 0,
    subroleTimings: extractTimings(subroleTimingByRole, role),
  }));

  // Build top fight-opening heroes (sorted by count, top 5)
  const topFightOpeningHeroes: FightOpeningHero[] = Array.from(
    fightOpeningHeroCounts.entries()
  )
    .map(([hero, count]) => ({ hero, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Build player rankings
  const playerRankings: PlayerUltRanking[] = [];
  for (const [playerName, entry] of ourPlayerUltCounts) {
    const hero = primaryHeroForPlayer(entry);
    const mapsPlayed = playerMapSets.get(playerName)?.size ?? 0;

    let topFightOpeningHero: string | null = null;
    let fightOpeningCount = 0;
    const openings = playerFightOpenings.get(playerName);
    if (openings) {
      for (const [h, count] of openings) {
        if (count > fightOpeningCount) {
          fightOpeningCount = count;
          topFightOpeningHero = h;
        }
      }
    }

    playerRankings.push({
      playerName,
      primaryHero: hero,
      totalUltsUsed: entry.totalCount,
      mapsPlayed,
      ultsPerMap: mapsPlayed > 0 ? entry.totalCount / mapsPlayed : 0,
      topFightOpeningHero,
      fightOpeningCount,
    });
  }
  playerRankings.sort((a, b) => b.totalUltsUsed - a.totalUltsUsed);

  // Compute charge/hold times from CalculatedStat
  const chargeTimeValues: number[] = [];
  const holdTimeValues: number[] = [];
  for (const cs of calculatedStats) {
    if (!teamRosterSet.has(cs.playerName) || cs.value <= 0) continue;
    if (cs.stat === "AVERAGE_ULT_CHARGE_TIME") chargeTimeValues.push(cs.value);
    else if (cs.stat === "AVERAGE_TIME_TO_USE_ULT")
      holdTimeValues.push(cs.value);
  }

  const avgChargeTime =
    chargeTimeValues.length > 0
      ? chargeTimeValues.reduce((a, b) => a + b, 0) / chargeTimeValues.length
      : 0;
  const avgHoldTime =
    holdTimeValues.length > 0
      ? holdTimeValues.reduce((a, b) => a + b, 0) / holdTimeValues.length
      : 0;

  const totalMaps = mapDataIds.length;

  return {
    totalUltsUsed: totalOurUltsUsed,
    totalUltsEarned,
    totalMaps,
    ultsPerMap: totalMaps > 0 ? totalOurUltsUsed / totalMaps : 0,
    avgChargeTime,
    avgHoldTime,
    fightInitiationRate:
      totalFightsWithUlts > 0
        ? (fightInitiationCount / totalFightsWithUlts) * 100
        : 0,
    fightInitiationCount,
    totalFightsWithUlts,
    topFightOpeningHeroes,
    roleBreakdown,
    playerRankings,
  };
}

export const getTeamUltStats = cache(getTeamUltStatsUncached);
