import { EffectObservabilityLive } from "@/instrumentation";
import { assessConfidence } from "@/lib/confidence";
import {
  hasScrimData,
  type DataAvailabilityProfile,
} from "@/lib/data-availability";
import prisma from "@/lib/prisma";
import type { HeroName } from "@/types/heroes";
import { heroRoleMapping } from "@/types/heroes";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import {
  ScrimOpponentService,
  ScrimOpponentServiceLive,
} from "@/data/scrim/opponent-service";
import {
  ScoutingService,
  ScoutingServiceLive,
} from "@/data/scouting/scouting-service";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "@/data/team/shared-data-service";
import { IntelligenceQueryError } from "./errors";
import {
  playerCacheRequestTotal,
  playerCacheMissTotal,
  playerIntelligenceQueryDuration,
  playerIntelligenceQueryErrorTotal,
  playerIntelligenceQuerySuccessTotal,
} from "./metrics";
import type {
  BestPlayerHighlight,
  HeroSubstitutionRate,
  PlayerHeroDepth,
  PlayerHeroZScore,
  PlayerIntelligence,
  PlayerVulnerability,
} from "./types";

type HeroRole = "Tank" | "Damage" | "Support";

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

  const playerMapIds = new Map<string, Set<number>>();
  const playerHeroMaps = new Map<string, Set<number>>();

  for (const stat of allPlayerStats) {
    if (!stat.MapDataId || stat.hero_time_played < MIN_HERO_TIME_SECONDS) {
      continue;
    }
    if (!teamRosterSet.has(stat.player_name)) continue;

    let mapIds = playerMapIds.get(stat.player_name);
    if (!mapIds) {
      mapIds = new Set();
      playerMapIds.set(stat.player_name, mapIds);
    }
    mapIds.add(stat.MapDataId);

    const heroKey = `${stat.player_name}\0${stat.player_hero}`;
    let heroMapIds = playerHeroMaps.get(heroKey);
    if (!heroMapIds) {
      heroMapIds = new Set();
      playerHeroMaps.set(heroKey, heroMapIds);
    }
    heroMapIds.add(stat.MapDataId);
  }

  const results: HeroSubstitutionRate[] = [];

  for (const [playerName, heroes] of allPlayerHeroes) {
    if (!teamRosterSet.has(playerName) || heroes.length === 0) continue;

    const primaryHero = heroes[0].hero;
    const mapIds = playerMapIds.get(playerName) ?? new Set<number>();
    const primaryHeroMapIds =
      playerHeroMaps.get(`${playerName}\0${primaryHero}`) ?? new Set<number>();

    const totalMaps = mapIds.size;
    let mapsOnPrimary = 0;
    let mapsForced = 0;

    for (const mapId of mapIds) {
      if (primaryHeroMapIds.has(mapId)) {
        mapsOnPrimary++;
      } else {
        const bans = bansByMap.get(mapId);
        if (bans?.has(primaryHero)) {
          mapsForced++;
        }
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
      performanceDelta: null,
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

export type IntelligenceServiceInterface = {
  readonly getPlayerIntelligence: (
    userTeamId: number,
    opponentAbbr: string | null,
    profile?: DataAvailabilityProfile
  ) => Effect.Effect<PlayerIntelligence, IntelligenceQueryError>;
};

export class IntelligenceService extends Context.Tag(
  "@app/data/player/IntelligenceService"
)<IntelligenceService, IntelligenceServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make = Effect.gen(function* () {
  const sharedData = yield* TeamSharedDataService;
  const scrimOpponent = yield* ScrimOpponentService;
  const scouting = yield* ScoutingService;

  function getPlayerIntelligence(
    userTeamId: number,
    opponentAbbr: string | null,
    profile?: DataAvailabilityProfile
  ): Effect.Effect<PlayerIntelligence, IntelligenceQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      userTeamId,
      opponentAbbr,
      hasProfile: !!profile,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("userTeamId", userTeamId);
      yield* Effect.annotateCurrentSpan("opponentAbbr", String(opponentAbbr));
      const baseData = yield* sharedData.getBaseTeamData(userTeamId).pipe(
        Effect.mapError(
          (error) =>
            new IntelligenceQueryError({
              operation: "fetch base team data",
              cause: error,
            })
        ),
        Effect.withSpan("player.intelligence.fetchBaseTeamData", {
          attributes: { userTeamId },
        })
      );

      const { allPlayerStats, teamRoster, teamRosterSet } = baseData;

      const allPlayerHeroes = new Map<string, PlayerHeroAgg[]>();
      for (const player of teamRoster) {
        const heroes = aggregatePlayerHeroes(
          player,
          allPlayerStats,
          teamRosterSet
        );
        if (heroes.length > 0) {
          allPlayerHeroes.set(player, heroes);
        }
      }

      const zScores = computeIntraTeamZScores(allPlayerHeroes);
      const playerDepths = buildPlayerDepths(allPlayerHeroes, zScores);

      const heroBans = yield* Effect.tryPromise({
        try: () =>
          prisma.heroBan.findMany({
            where: { MapDataId: { in: baseData.mapDataIds } },
            select: { MapDataId: true, hero: true },
          }),
        catch: (error) =>
          new IntelligenceQueryError({
            operation: "fetch hero bans",
            cause: error,
          }),
      }).pipe(
        Effect.withSpan("player.intelligence.fetchHeroBans", {
          attributes: { userTeamId, mapCount: baseData.mapDataIds.length },
        })
      );

      const substitutionRates = computeSubstitutionRates(
        allPlayerHeroes,
        allPlayerStats,
        teamRosterSet,
        heroBans
      );

      const opponentBanCounts = new Map<string, number>();
      let totalOpponentMaps = 0;

      if (opponentAbbr) {
        const opponentMatches = yield* scouting
          .getOpponentMatchData(opponentAbbr)
          .pipe(
            Effect.mapError(
              (error) =>
                new IntelligenceQueryError({
                  operation: "fetch opponent match data",
                  cause: error,
                })
            ),
            Effect.withSpan("player.intelligence.fetchOpponentMatches", {
              attributes: { opponentAbbr },
            })
          );

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
          const scrimBans = yield* scrimOpponent
            .getOpponentScrimHeroBans(userTeamId, opponentAbbr)
            .pipe(
              Effect.mapError(
                (error) =>
                  new IntelligenceQueryError({
                    operation: "fetch opponent scrim hero bans",
                    cause: error,
                  })
              ),
              Effect.withSpan("player.intelligence.fetchScrimBans", {
                attributes: { userTeamId, opponentAbbr },
              })
            );

          for (const scrimMap of scrimBans) {
            totalOpponentMaps++;
            for (const hero of scrimMap.opponentBans) {
              opponentBanCounts.set(
                hero,
                (opponentBanCounts.get(hero) ?? 0) + 1
              );
            }
          }
        }
      }

      wideEvent.total_opponent_maps = totalOpponentMaps;
      wideEvent.player_count = allPlayerHeroes.size;

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

      wideEvent.outcome = "success";
      yield* Metric.increment(playerIntelligenceQuerySuccessTotal);

      return {
        playerDepths,
        substitutionRates,
        vulnerabilities,
        bestPlayer,
      };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(
          Effect.andThen(Metric.increment(playerIntelligenceQueryErrorTotal))
        )
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("player.getPlayerIntelligence")
              : Effect.logInfo("player.getPlayerIntelligence");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(
              playerIntelligenceQueryDuration(Effect.succeed(durationMs))
            )
          );
        })
      ),
      Effect.withSpan("player.getPlayerIntelligence")
    );
  }

  const intelligenceCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const parsed = JSON.parse(key) as [
        number,
        string | null,
        DataAvailabilityProfile | undefined,
      ];
      return getPlayerIntelligence(parsed[0], parsed[1], parsed[2]).pipe(
        Effect.tap(() => Metric.increment(playerCacheMissTotal))
      );
    },
  });

  return {
    getPlayerIntelligence: (
      userTeamId: number,
      opponentAbbr: string | null,
      profile?: DataAvailabilityProfile
    ) =>
      intelligenceCache
        .get(JSON.stringify([userTeamId, opponentAbbr, profile]))
        .pipe(Effect.tap(() => Metric.increment(playerCacheRequestTotal))),
  } satisfies IntelligenceServiceInterface;
});

export const IntelligenceServiceLive = Layer.effect(
  IntelligenceService,
  make
).pipe(
  Layer.provide(TeamSharedDataServiceLive),
  Layer.provide(ScrimOpponentServiceLive),
  Layer.provide(ScoutingServiceLive),
  Layer.provide(EffectObservabilityLive)
);
