import "server-only";

import { assessConfidence, type ConfidenceMetadata } from "@/lib/confidence";
import {
  hasScrimData,
  type DataAvailabilityProfile,
} from "@/lib/data-availability";
import prisma from "@/lib/prisma";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import { cache } from "react";
import { getBaseTeamData } from "./team-shared-data";
import { getOpponentScrimHeroBans } from "./scrim-opponent-dto";

type HeroRole = "Tank" | "Damage" | "Support";

export type PlayerHeroZScore = {
  hero: string;
  role: HeroRole;
  compositeZScore: number;
  mapsPlayed: number;
  totalTimePlayed: number;
  isPrimary: boolean;
};

export type PlayerHeroDepth = {
  playerName: string;
  role: HeroRole;
  heroes: PlayerHeroZScore[];
  primarySecondaryDelta: number | null;
  heroPoolSize: number;
  confidence: ConfidenceMetadata;
};

export type HeroSubstitutionRate = {
  playerName: string;
  primaryHero: string;
  totalMaps: number;
  mapsOnPrimary: number;
  mapsForced: number;
  substitutionRate: number;
  performanceDelta: number | null;
};

export type PlayerVulnerability = {
  playerName: string;
  role: HeroRole;
  primaryHero: string;
  heroDepthDelta: number;
  opponentBanRate: number;
  opponentBanCount: number;
  vulnerabilityIndex: number;
  riskLevel: "critical" | "high" | "moderate" | "low";
};

export type BestPlayerHighlight = {
  playerName: string;
  role: HeroRole;
  primaryHero: string;
  compositeZScore: number;
  mapsPlayed: number;
  isTargetedByBans: boolean;
  banTargetRate: number;
};

export type PlayerIntelligence = {
  playerDepths: PlayerHeroDepth[];
  substitutionRates: HeroSubstitutionRate[];
  vulnerabilities: PlayerVulnerability[];
  bestPlayer: BestPlayerHighlight | null;
};

const MIN_HERO_TIME_SECONDS = 120;
const MIN_MAPS_FOR_HERO = 3;

type PlayerHeroAgg = {
  hero: string;
  role: HeroRole;
  maps: number;
  totalTime: number;
  elimsPer10: number;
  deathsPer10: number;
  damagePer10: number;
  healingPer10: number;
};

function aggregatePlayerHeroes(
  playerName: string,
  allPlayerStats: {
    player_name: string;
    player_hero: string;
    hero_time_played: number;
    MapDataId: number | null;
    eliminations: number;
    deaths: number;
    hero_damage_dealt: number;
    healing_dealt: number;
  }[],
  teamRosterSet: Set<string>
): PlayerHeroAgg[] {
  if (!teamRosterSet.has(playerName)) return [];

  // Group by hero, deduplicating by MapDataId (take latest stat per map per hero)
  const heroData = new Map<
    string,
    {
      mapIds: Set<number>;
      totalTime: number;
      totalElims: number;
      totalDeaths: number;
      totalDamage: number;
      totalHealing: number;
    }
  >();

  for (const stat of allPlayerStats) {
    if (stat.player_name !== playerName || !stat.MapDataId) continue;
    if (stat.hero_time_played < MIN_HERO_TIME_SECONDS) continue;

    let data = heroData.get(stat.player_hero);
    if (!data) {
      data = {
        mapIds: new Set(),
        totalTime: 0,
        totalElims: 0,
        totalDeaths: 0,
        totalDamage: 0,
        totalHealing: 0,
      };
      heroData.set(stat.player_hero, data);
    }

    if (!data.mapIds.has(stat.MapDataId)) {
      data.mapIds.add(stat.MapDataId);
      data.totalTime += stat.hero_time_played;
      data.totalElims += stat.eliminations;
      data.totalDeaths += stat.deaths;
      data.totalDamage += stat.hero_damage_dealt;
      data.totalHealing += stat.healing_dealt;
    }
  }

  return Array.from(heroData.entries())
    .filter(([, data]) => data.mapIds.size >= MIN_MAPS_FOR_HERO)
    .map(([hero, data]) => {
      const timePer10 = data.totalTime > 0 ? 600 / data.totalTime : 0;
      const role = heroRoleMapping[hero as HeroName] ?? ("Damage" as HeroRole);
      return {
        hero,
        role,
        maps: data.mapIds.size,
        totalTime: data.totalTime,
        elimsPer10: data.totalElims * timePer10,
        deathsPer10: data.totalDeaths * timePer10,
        damagePer10: data.totalDamage * timePer10,
        healingPer10: data.totalHealing * timePer10,
      };
    })
    .sort((a, b) => b.totalTime - a.totalTime);
}

/**
 * Computes a composite z-score for each player-hero combination by
 * normalizing per-10 stats within the same **role** across all players.
 *
 * Grouping by role (not by hero) is critical: on a typical roster only
 * one player plays each hero, so per-hero stddev would be 0 and every
 * z-score would collapse to 0. Pooling all Tank hero-performances into
 * one distribution, all Damage into another, and all Support into a
 * third gives us enough data points for meaningful variance.
 */
function computeIntraTeamZScores(
  allPlayerHeroes: Map<string, PlayerHeroAgg[]>
): Map<string, Map<string, number>> {
  type StatBucket = {
    elims: number[];
    deaths: number[];
    damage: number[];
    healing: number[];
  };

  const roleStats = new Map<HeroRole, StatBucket>();

  for (const [, heroes] of allPlayerHeroes) {
    for (const h of heroes) {
      let bucket = roleStats.get(h.role);
      if (!bucket) {
        bucket = { elims: [], deaths: [], damage: [], healing: [] };
        roleStats.set(h.role, bucket);
      }
      bucket.elims.push(h.elimsPer10);
      bucket.deaths.push(h.deathsPer10);
      bucket.damage.push(h.damagePer10);
      bucket.healing.push(h.healingPer10);
    }
  }

  function mean(arr: number[]) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  function stddev(arr: number[]) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(
      arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1)
    );
  }

  const zScores = new Map<string, Map<string, number>>();

  for (const [playerName, heroes] of allPlayerHeroes) {
    const playerZScores = new Map<string, number>();
    for (const h of heroes) {
      const stats = roleStats.get(h.role);
      if (!stats) continue;

      const weights =
        h.role === "Tank"
          ? { elims: 0.2, deaths: -0.3, damage: 0.2, healing: 0 }
          : h.role === "Support"
            ? { elims: 0.1, deaths: -0.25, damage: 0.14, healing: 0.35 }
            : { elims: 0.3, deaths: -0.2, damage: 0.3, healing: 0 };

      let composite = 0;
      const elimStd = stddev(stats.elims);
      const deathStd = stddev(stats.deaths);
      const damageStd = stddev(stats.damage);
      const healingStd = stddev(stats.healing);

      if (elimStd > 0)
        composite +=
          ((h.elimsPer10 - mean(stats.elims)) / elimStd) * weights.elims;
      if (deathStd > 0)
        composite +=
          ((h.deathsPer10 - mean(stats.deaths)) / deathStd) * weights.deaths;
      if (damageStd > 0)
        composite +=
          ((h.damagePer10 - mean(stats.damage)) / damageStd) * weights.damage;
      if (healingStd > 0)
        composite +=
          ((h.healingPer10 - mean(stats.healing)) / healingStd) *
          weights.healing;

      playerZScores.set(h.hero, composite);
    }
    zScores.set(playerName, playerZScores);
  }

  return zScores;
}

function buildPlayerDepths(
  allPlayerHeroes: Map<string, PlayerHeroAgg[]>,
  zScores: Map<string, Map<string, number>>
): PlayerHeroDepth[] {
  const depths: PlayerHeroDepth[] = [];

  for (const [playerName, heroes] of allPlayerHeroes) {
    if (heroes.length === 0) continue;

    const playerZScores = zScores.get(playerName) ?? new Map<string, number>();
    const primaryRole = heroes[0].role;

    const heroZScores: PlayerHeroZScore[] = heroes.map((h, i) => ({
      hero: h.hero,
      role: h.role,
      compositeZScore: playerZScores.get(h.hero) ?? 0,
      mapsPlayed: h.maps,
      totalTimePlayed: h.totalTime,
      isPrimary: i === 0,
    }));

    heroZScores.sort((a, b) => b.compositeZScore - a.compositeZScore);
    if (heroZScores.length > 0) heroZScores[0].isPrimary = true;

    let primarySecondaryDelta: number | null = null;
    if (heroZScores.length >= 2) {
      primarySecondaryDelta =
        heroZScores[0].compositeZScore - heroZScores[1].compositeZScore;
    }

    const totalMaps = heroes.reduce((sum, h) => sum + h.maps, 0);

    depths.push({
      playerName,
      role: primaryRole,
      heroes: heroZScores,
      primarySecondaryDelta,
      heroPoolSize: heroZScores.length,
      confidence: assessConfidence(totalMaps),
    });
  }

  return depths.sort((a, b) => {
    const aTop = a.heroes[0]?.compositeZScore ?? 0;
    const bTop = b.heroes[0]?.compositeZScore ?? 0;
    return bTop - aTop;
  });
}

function computeSubstitutionRates(
  allPlayerHeroes: Map<string, PlayerHeroAgg[]>,
  allPlayerStats: {
    player_name: string;
    player_hero: string;
    MapDataId: number | null;
    hero_time_played: number;
  }[],
  teamRosterSet: Set<string>,
  heroBans: { MapDataId: number; hero: string }[]
): HeroSubstitutionRate[] {
  const bansByMap = new Map<number, Set<string>>();
  for (const ban of heroBans) {
    let bans = bansByMap.get(ban.MapDataId);
    if (!bans) {
      bans = new Set();
      bansByMap.set(ban.MapDataId, bans);
    }
    bans.add(ban.hero);
  }

  const results: HeroSubstitutionRate[] = [];

  for (const [playerName, heroes] of allPlayerHeroes) {
    if (!teamRosterSet.has(playerName) || heroes.length === 0) continue;

    const primaryHero = heroes[0].hero;
    const playerMapIds = new Set<number>();
    for (const stat of allPlayerStats) {
      if (
        stat.player_name === playerName &&
        stat.MapDataId &&
        stat.hero_time_played >= MIN_HERO_TIME_SECONDS
      ) {
        playerMapIds.add(stat.MapDataId);
      }
    }

    const totalMaps = playerMapIds.size;
    let mapsOnPrimary = 0;
    let mapsForced = 0;

    for (const mapId of playerMapIds) {
      const bans = bansByMap.get(mapId);
      const primaryBanned = bans?.has(primaryHero) ?? false;

      const playedPrimary = allPlayerStats.some(
        (s) =>
          s.player_name === playerName &&
          s.MapDataId === mapId &&
          s.player_hero === primaryHero &&
          s.hero_time_played >= MIN_HERO_TIME_SECONDS
      );

      if (playedPrimary) {
        mapsOnPrimary++;
      } else if (primaryBanned) {
        mapsForced++;
      }
    }

    const substitutionRate = totalMaps > 0 ? (mapsForced / totalMaps) * 100 : 0;

    results.push({
      playerName,
      primaryHero,
      totalMaps,
      mapsOnPrimary,
      mapsForced,
      substitutionRate,
      performanceDelta: null, // Would require per-map WR computation — deferred to Phase 3 insight generation
    });
  }

  return results.sort((a, b) => b.substitutionRate - a.substitutionRate);
}

function computeVulnerabilities(
  playerDepths: PlayerHeroDepth[],
  opponentBanCounts: Map<string, number>,
  totalOpponentMaps: number
): PlayerVulnerability[] {
  return playerDepths
    .filter((p) => p.heroes.length >= 1)
    .map((p) => {
      const primaryHero = p.heroes[0].hero;
      const heroDepthDelta = p.primarySecondaryDelta ?? 0;
      const opponentBanCount = opponentBanCounts.get(primaryHero) ?? 0;
      const opponentBanRate =
        totalOpponentMaps > 0
          ? (opponentBanCount / totalOpponentMaps) * 100
          : 0;

      // Vulnerability index = hero depth delta * opponent ban rate / 100
      // High delta + high ban rate = high vulnerability
      const vulnerabilityIndex = heroDepthDelta * (opponentBanRate / 100);

      const CRITICAL_THRESHOLD = 0.5;
      const HIGH_THRESHOLD = 0.25;
      const MODERATE_THRESHOLD = 0.1;

      const riskLevel: PlayerVulnerability["riskLevel"] =
        vulnerabilityIndex >= CRITICAL_THRESHOLD
          ? "critical"
          : vulnerabilityIndex >= HIGH_THRESHOLD
            ? "high"
            : vulnerabilityIndex >= MODERATE_THRESHOLD
              ? "moderate"
              : "low";

      return {
        playerName: p.playerName,
        role: p.role,
        primaryHero,
        heroDepthDelta,
        opponentBanRate,
        opponentBanCount,
        vulnerabilityIndex,
        riskLevel,
      };
    })
    .sort((a, b) => b.vulnerabilityIndex - a.vulnerabilityIndex);
}

function findBestPlayer(
  playerDepths: PlayerHeroDepth[],
  opponentBanCounts: Map<string, number>,
  totalOpponentMaps: number
): BestPlayerHighlight | null {
  if (playerDepths.length === 0) return null;

  const best = playerDepths[0];
  if (best.heroes.length === 0) return null;

  const primaryHero = best.heroes[0].hero;
  const banCount = opponentBanCounts.get(primaryHero) ?? 0;
  const banRate =
    totalOpponentMaps > 0 ? (banCount / totalOpponentMaps) * 100 : 0;

  return {
    playerName: best.playerName,
    role: best.role,
    primaryHero,
    compositeZScore: best.heroes[0].compositeZScore,
    mapsPlayed: best.heroes.reduce((sum, h) => sum + h.mapsPlayed, 0),
    isTargetedByBans: banRate >= 15,
    banTargetRate: banRate,
  };
}

async function getPlayerIntelligenceFn(
  userTeamId: number,
  opponentAbbr: string | null,
  profile?: DataAvailabilityProfile
): Promise<PlayerIntelligence> {
  const baseData = await getBaseTeamData(userTeamId);
  const { allPlayerStats, teamRoster, teamRosterSet } = baseData;

  // Aggregate hero stats per player
  const allPlayerHeroes = new Map<string, PlayerHeroAgg[]>();
  for (const player of teamRoster) {
    const heroes = aggregatePlayerHeroes(player, allPlayerStats, teamRosterSet);
    if (heroes.length > 0) {
      allPlayerHeroes.set(player, heroes);
    }
  }

  const zScores = computeIntraTeamZScores(allPlayerHeroes);
  const playerDepths = buildPlayerDepths(allPlayerHeroes, zScores);

  // Get internal hero bans for substitution rate computation
  const heroBans = await prisma.heroBan.findMany({
    where: { MapDataId: { in: baseData.mapDataIds } },
    select: { MapDataId: true, hero: true },
  });

  const substitutionRates = computeSubstitutionRates(
    allPlayerHeroes,
    allPlayerStats,
    teamRosterSet,
    heroBans
  );

  const opponentBanCounts = new Map<string, number>();
  let totalOpponentMaps = 0;

  if (opponentAbbr) {
    const opponentMatches = await prisma.scoutingMatch.findMany({
      where: { OR: [{ team1: opponentAbbr }, { team2: opponentAbbr }] },
      include: { maps: { include: { heroBans: true } } },
    });

    for (const match of opponentMatches) {
      const opponentSide = match.team1 === opponentAbbr ? "team2" : "team1";
      for (const map of match.maps) {
        totalOpponentMaps++;
        for (const ban of map.heroBans) {
          if (ban.team === opponentSide) {
            opponentBanCounts.set(
              ban.hero,
              (opponentBanCounts.get(ban.hero) ?? 0) + 1
            );
          }
        }
      }
    }

    const includesScrimData = !!profile && hasScrimData(profile);
    if (includesScrimData) {
      const scrimBans = await getOpponentScrimHeroBans(
        userTeamId,
        opponentAbbr
      );
      for (const scrimMap of scrimBans) {
        totalOpponentMaps++;
        for (const hero of scrimMap.opponentBans) {
          opponentBanCounts.set(hero, (opponentBanCounts.get(hero) ?? 0) + 1);
        }
      }
    }
  }

  const vulnerabilities = computeVulnerabilities(
    playerDepths,
    opponentBanCounts,
    totalOpponentMaps
  );

  const bestPlayer = findBestPlayer(
    playerDepths,
    opponentBanCounts,
    totalOpponentMaps
  );

  return {
    playerDepths,
    substitutionRates,
    vulnerabilities,
    bestPlayer,
  };
}

export const getPlayerIntelligence = cache(getPlayerIntelligenceFn);
