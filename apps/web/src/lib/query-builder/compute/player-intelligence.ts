import "server-only";

import { findTeamNameForMapInMemory } from "@/data/team/shared-core";
import { determineRole } from "@/lib/player-table-data";
import prisma from "@/lib/prisma";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";
import type { HeroName } from "@/types/heroes";

type Role = "Tank" | "Damage" | "Support";

const MIN_HERO_TIME_SECONDS = 120;
const MIN_MAPS_FOR_HERO = 3;

type HeroAggregate = {
  player: string;
  hero: HeroName;
  role: Role;
  mapIds: Set<number>;
  totalTime: number;
  eliminations: number;
  deaths: number;
  heroDamage: number;
  healing: number;
};

type HeroSummary = {
  player: string;
  hero: HeroName;
  role: Role;
  maps: number;
  totalTime: number;
  elimsPer10: number;
  deathsPer10: number;
  damagePer10: number;
  healingPer10: number;
};

type StatBucket = {
  elims: number[];
  deaths: number[];
  damage: number[];
  healing: number[];
};

function asRole(hero: HeroName): Role | null {
  const role = determineRole(hero);
  return role === "Tank" || role === "Damage" || role === "Support"
    ? role
    : null;
}

function mean(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
      (values.length - 1)
  );
}

function zScore(value: number, values: number[]): number {
  const std = stddev(values);
  return std === 0 ? 0 : (value - mean(values)) / std;
}

function compositeZScore(summary: HeroSummary, bucket: StatBucket): number {
  const weights =
    summary.role === "Tank"
      ? { elims: 0.2, deaths: -0.3, damage: 0.2, healing: 0 }
      : summary.role === "Support"
        ? { elims: 0.1, deaths: -0.25, damage: 0.14, healing: 0.35 }
        : { elims: 0.3, deaths: -0.2, damage: 0.3, healing: 0 };

  return (
    zScore(summary.elimsPer10, bucket.elims) * weights.elims +
    zScore(summary.deathsPer10, bucket.deaths) * weights.deaths +
    zScore(summary.damagePer10, bucket.damage) * weights.damage +
    zScore(summary.healingPer10, bucket.healing) * weights.healing
  );
}

/**
 * Queryable player-intelligence rows derived from the existing hero-depth
 * analysis: one row per qualifying player/hero, with player-level depth and
 * substitution metrics repeated so the generic aggregator can pivot freely.
 */
export async function computePlayerIntelligence(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = await getTeamData(teamId);
  const inScope = new Set(scrimIds);
  const scopedMapIds = new Set<number>();
  const heroAggregates = new Map<string, HeroAggregate>();
  const playerMapIds = new Map<string, Set<number>>();
  const playerHeroMapIds = new Map<string, Set<number>>();

  function addPlayerMap(player: string, mapId: number) {
    const maps = playerMapIds.get(player) ?? new Set<number>();
    maps.add(mapId);
    playerMapIds.set(player, maps);
  }

  function addPlayerHeroMap(player: string, hero: HeroName, mapId: number) {
    const key = `${player}\0${hero}`;
    const maps = playerHeroMapIds.get(key) ?? new Set<number>();
    maps.add(mapId);
    playerHeroMapIds.set(key, maps);
  }

  for (const record of data.mapDataRecords) {
    if (!record.Scrim || !inScope.has(record.Scrim.id)) continue;

    const teamName = findTeamNameForMapInMemory(
      record.id,
      data.allPlayerStats,
      data.teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = data.allPlayerStats.filter(
      (stat) => stat.MapDataId === record.id && stat.player_team === teamName
    );
    if (!playersOnMap.every((p) => data.teamRosterSet.has(p.player_name))) {
      continue;
    }

    scopedMapIds.add(record.id);

    for (const stat of playersOnMap) {
      if (stat.hero_time_played < MIN_HERO_TIME_SECONDS) continue;

      const hero = stat.player_hero as HeroName;
      const role = asRole(hero);
      if (!role) continue;

      const player = stat.player_name;
      const key = `${player}\0${hero}`;
      const aggregate =
        heroAggregates.get(key) ??
        ({
          player,
          hero,
          role,
          mapIds: new Set<number>(),
          totalTime: 0,
          eliminations: 0,
          deaths: 0,
          heroDamage: 0,
          healing: 0,
        } satisfies HeroAggregate);

      aggregate.mapIds.add(record.id);
      aggregate.totalTime += stat.hero_time_played;
      aggregate.eliminations += stat.eliminations;
      aggregate.deaths += stat.deaths;
      aggregate.heroDamage += stat.hero_damage_dealt;
      aggregate.healing += stat.healing_dealt;
      heroAggregates.set(key, aggregate);

      addPlayerMap(player, record.id);
      addPlayerHeroMap(player, hero, record.id);
    }
  }

  if (scopedMapIds.size === 0) return [];

  const heroBans = await prisma.heroBan.findMany({
    where: { MapDataId: { in: Array.from(scopedMapIds) } },
    select: { MapDataId: true, hero: true },
  });
  const bansByMap = new Map<number, Set<string>>();
  for (const ban of heroBans) {
    const bans = bansByMap.get(ban.MapDataId) ?? new Set<string>();
    bans.add(ban.hero);
    bansByMap.set(ban.MapDataId, bans);
  }

  const byPlayer = new Map<string, HeroSummary[]>();
  for (const aggregate of heroAggregates.values()) {
    if (aggregate.mapIds.size < MIN_MAPS_FOR_HERO) continue;

    const scale = aggregate.totalTime > 0 ? 600 / aggregate.totalTime : 0;
    const summary: HeroSummary = {
      player: aggregate.player,
      hero: aggregate.hero,
      role: aggregate.role,
      maps: aggregate.mapIds.size,
      totalTime: aggregate.totalTime,
      elimsPer10: aggregate.eliminations * scale,
      deathsPer10: aggregate.deaths * scale,
      damagePer10: aggregate.heroDamage * scale,
      healingPer10: aggregate.healing * scale,
    };

    const summaries = byPlayer.get(summary.player) ?? [];
    summaries.push(summary);
    byPlayer.set(summary.player, summaries);
  }

  const roleStats = new Map<Role, StatBucket>();
  for (const summaries of byPlayer.values()) {
    for (const summary of summaries) {
      const bucket =
        roleStats.get(summary.role) ??
        ({
          elims: [],
          deaths: [],
          damage: [],
          healing: [],
        } satisfies StatBucket);
      bucket.elims.push(summary.elimsPer10);
      bucket.deaths.push(summary.deathsPer10);
      bucket.damage.push(summary.damagePer10);
      bucket.healing.push(summary.healingPer10);
      roleStats.set(summary.role, bucket);
    }
  }

  const rows: ComputedRow[] = [];
  for (const [player, summaries] of byPlayer.entries()) {
    if (summaries.length === 0) continue;

    const byTime = [...summaries].sort((a, b) => b.totalTime - a.totalTime);
    const mostPlayedHero = byTime[0];
    const playerTotalTime = summaries.reduce(
      (sum, summary) => sum + summary.totalTime,
      0
    );
    const totalMaps = playerMapIds.get(player)?.size ?? 0;
    const mapsOnPrimary =
      playerHeroMapIds.get(`${player}\0${mostPlayedHero.hero}`)?.size ?? 0;
    let mapsForced = 0;

    for (const mapId of playerMapIds.get(player) ?? []) {
      const playedPrimary = playerHeroMapIds
        .get(`${player}\0${mostPlayedHero.hero}`)
        ?.has(mapId);
      if (!playedPrimary && bansByMap.get(mapId)?.has(mostPlayedHero.hero)) {
        mapsForced++;
      }
    }

    const substitutionRate = totalMaps > 0 ? (mapsForced / totalMaps) * 100 : 0;
    const scored = summaries
      .map((summary) => ({
        ...summary,
        compositeZScore: compositeZScore(
          summary,
          roleStats.get(summary.role) ?? {
            elims: [],
            deaths: [],
            damage: [],
            healing: [],
          }
        ),
      }))
      .sort((a, b) => b.compositeZScore - a.compositeZScore);
    const primaryHero = scored[0];
    const primarySecondaryDelta =
      scored.length >= 2
        ? primaryHero.compositeZScore - scored[1].compositeZScore
        : 0;

    for (const summary of scored) {
      rows.push({
        player,
        hero: summary.hero,
        role: summary.role,
        primary_hero: primaryHero.hero,
        most_played_hero: mostPlayedHero.hero,
        is_primary: summary.hero === primaryHero.hero ? "yes" : "no",
        is_most_played: summary.hero === mostPlayedHero.hero ? "yes" : "no",
        hero_pool_size: scored.length,
        primary_secondary_delta: primarySecondaryDelta,
        composite_z_score: summary.compositeZScore,
        maps_played: summary.maps,
        time_played: summary.totalTime,
        player_total_time: playerTotalTime,
        most_played_time: mostPlayedHero.totalTime,
        total_maps: totalMaps,
        maps_on_primary: mapsOnPrimary,
        maps_forced: mapsForced,
        substitution_rate: substitutionRate,
        elims_per10: summary.elimsPer10,
        deaths_per10: summary.deathsPer10,
        damage_per10: summary.damagePer10,
        healing_per10: summary.healingPer10,
      });
    }
  }

  return rows;
}
