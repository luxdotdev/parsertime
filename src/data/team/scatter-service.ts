import {
  type PlayerScatterBucket,
  type PlayerScatterStats,
  toRoleName,
} from "@/lib/team-scatter-stats";
import type { HeroName } from "@/types/heroes";
import {
  Cache,
  Context,
  Duration,
  Effect,
  Layer,
  Metric,
  MetricBoundaries,
} from "effect";
import { TeamQueryError } from "./errors";
import { teamCacheMissTotal, teamCacheRequestTotal } from "./metrics";
import type { BaseTeamData, TeamDateRange } from "./shared-core";
import { parseDateRangeFromCacheKey } from "./shared-core";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";
import { getTeamSubstituteNames } from "./substitutes";

const scatterQuerySuccessTotal = Metric.counter("team.scatter.query.success", {
  description: "Total successful team scatter queries",
  incremental: true,
});

const scatterQueryErrorTotal = Metric.counter("team.scatter.query.error", {
  description: "Total team scatter query failures",
  incremental: true,
});

const scatterQueryDuration = Metric.histogram(
  "team.scatter.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team scatter query duration in milliseconds"
);

function emptyBucket(hero: HeroName): PlayerScatterBucket {
  return {
    hero,
    timePlayed: 0,
    eliminations: 0,
    final_blows: 0,
    deaths: 0,
    hero_damage_dealt: 0,
    healing_dealt: 0,
    healing_received: 0,
    self_healing: 0,
    damage_taken: 0,
    damage_blocked: 0,
    ultimates_earned: 0,
    ultimates_used: 0,
    solo_kills: 0,
    environmental_kills: 0,
  };
}

export function processPlayerScatterStats(
  baseData: BaseTeamData,
  substituteNames: Set<string>
): PlayerScatterStats[] {
  const { teamRosterSet, allPlayerStats } = baseData;
  const byPlayer = new Map<string, Map<string, PlayerScatterBucket>>();

  for (const s of allPlayerStats) {
    if (!teamRosterSet.has(s.player_name)) continue;
    // Substitutes stay on the identity roster but are dropped from this
    // per-player view, mirroring how they're excluded from other team stats.
    if (substituteNames.has(s.player_name)) continue;
    if (!s.MapDataId) continue;

    let heroes = byPlayer.get(s.player_name);
    if (!heroes) {
      heroes = new Map();
      byPlayer.set(s.player_name, heroes);
    }

    let b = heroes.get(s.player_hero);
    if (!b) {
      b = emptyBucket(s.player_hero as HeroName);
      heroes.set(s.player_hero, b);
    }

    b.timePlayed += s.hero_time_played;
    b.eliminations += s.eliminations;
    b.final_blows += s.final_blows;
    b.deaths += s.deaths;
    b.hero_damage_dealt += s.hero_damage_dealt;
    b.healing_dealt += s.healing_dealt;
    b.healing_received += s.healing_received;
    b.self_healing += s.self_healing;
    b.damage_taken += s.damage_taken;
    b.damage_blocked += s.damage_blocked;
    b.ultimates_earned += s.ultimates_earned;
    b.ultimates_used += s.ultimates_used;
    b.solo_kills += s.solo_kills;
    b.environmental_kills += s.environmental_kills;
  }

  const result: PlayerScatterStats[] = [];
  for (const [playerName, heroes] of byPlayer) {
    const buckets = [...heroes.values()];
    const top = buckets.reduce((a, c) => (c.timePlayed > a.timePlayed ? c : a));
    result.push({
      playerName,
      primaryRole: toRoleName(top.hero),
      buckets,
    });
  }

  return result.sort((a, b) => a.playerName.localeCompare(b.playerName));
}

export type TeamScatterServiceInterface = {
  readonly getPlayerScatterStats: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<PlayerScatterStats[], TeamQueryError>;
};

export class TeamScatterService extends Context.Tag(
  "@app/data/team/TeamScatterService"
)<TeamScatterService, TeamScatterServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getPlayerScatterStats(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<PlayerScatterStats[], TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const data = yield* shared.getBaseTeamData(teamId, { dateRange });
      const substituteNames = yield* Effect.tryPromise({
        try: () => getTeamSubstituteNames(teamId),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch substitutes for scatter",
            cause: error,
          }),
      });
      const result = processPlayerScatterStats(data, substituteNames);
      wideEvent.outcome = "success";
      wideEvent.player_count = result.length;
      yield* Metric.increment(scatterQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(scatterQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.scatter.getPlayerScatterStats")
              : Effect.logInfo("team.scatter.getPlayerScatterStats");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(scatterQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.scatter.getPlayerScatterStats")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const scatterCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getPlayerScatterStats(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getPlayerScatterStats: (teamId: number, dateRange?: TeamDateRange) =>
      scatterCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamScatterServiceInterface;
});

export const TeamScatterServiceLive = Layer.effect(
  TeamScatterService,
  make
).pipe(Layer.provide(TeamSharedDataServiceLive));
