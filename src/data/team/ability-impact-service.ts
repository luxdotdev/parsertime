import prisma from "@/lib/prisma";
import { heroAbilityMapping } from "@/types/heroes";
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
import type { ExtendedTeamData, TeamDateRange } from "./shared-core";
import { findTeamNameForMapInMemory } from "./shared-core";
import { teamCacheRequestTotal, teamCacheMissTotal } from "./metrics";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";

const abilityImpactQuerySuccessTotal = Metric.counter(
  "team.ability_impact.query.success",
  {
    description: "Total successful team ability impact queries",
    incremental: true,
  }
);
const abilityImpactQueryErrorTotal = Metric.counter(
  "team.ability_impact.query.error",
  { description: "Total team ability impact query failures", incremental: true }
);
const abilityImpactQueryDuration = Metric.histogram(
  "team.ability_impact.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team ability impact query duration in milliseconds"
);

export type {
  AbilityScenarioStats,
  AbilityImpactData,
  HeroAbilityImpact,
  AbilityImpactAnalysis,
} from "./types";
import type {
  AbilityScenarioStats,
  AbilityImpactData,
  HeroAbilityImpact,
  AbilityImpactAnalysis,
} from "./types";

function emptyScenario(): AbilityScenarioStats {
  return { fights: 0, wins: 0, losses: 0, winrate: 0 };
}
function finalizeScenario(s: AbilityScenarioStats): AbilityScenarioStats {
  return { ...s, winrate: s.fights > 0 ? (s.wins / s.fights) * 100 : 0 };
}

type FightEvent = {
  event_type: string;
  match_time: number;
  attacker_team: string;
  attacker_hero: string;
  victim_team?: string;
  victim_hero?: string;
};
type Fight = { events: FightEvent[]; start: number; end: number };
type AbilityEvent = {
  match_time: number;
  player_team: string;
  player_hero: string;
  MapDataId: number | null;
};

const ABILITY_PRE_BUFFER = 5;
const ABILITY_POST_BUFFER = 2;

function processAbilityImpactAnalysis(
  sharedData: ExtendedTeamData,
  allAbility1Events: AbilityEvent[],
  allAbility2Events: AbilityEvent[]
): AbilityImpactAnalysis {
  const { teamRosterSet, mapDataIds, allPlayerStats, allKills, allRezzes } =
    sharedData;
  if (mapDataIds.length === 0) return { byHero: {}, availableHeroes: [] };

  const teamNameByMapId = new Map<number, string>();
  for (const mapDataId of mapDataIds) {
    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (teamName) teamNameByMapId.set(mapDataId, teamName);
  }

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

  type AbilitySlotAccum = {
    usedByUs: AbilityScenarioStats;
    notUsedByUs: AbilityScenarioStats;
    usedByEnemy: AbilityScenarioStats;
    notUsedByEnemy: AbilityScenarioStats;
    totalFightsAnalyzed: number;
  };
  type HeroAccum = { ability1: AbilitySlotAccum; ability2: AbilitySlotAccum };
  const heroStats = new Map<string, HeroAccum>();

  function getOrCreateHero(hero: string): HeroAccum {
    if (!heroStats.has(hero))
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

    for (const fight of fights) {
      let ourKills = 0,
        enemyKills = 0;
      for (const event of fight.events) {
        if (event.event_type === "mercy_rez") {
          if (event.victim_team === ourTeamName)
            enemyKills = Math.max(0, enemyKills - 1);
          else ourKills = Math.max(0, ourKills - 1);
        } else if (event.event_type === "kill") {
          if (event.attacker_team === ourTeamName) ourKills++;
          else enemyKills++;
        }
      }
      const won = ourKills > enemyKills;

      const heroPresence = new Map<
        string,
        { ourTeam: boolean; enemyTeam: boolean }
      >();
      function markPresence(hero: string, team: string) {
        if (!heroPresence.has(hero))
          heroPresence.set(hero, { ourTeam: false, enemyTeam: false });
        const p = heroPresence.get(hero)!;
        if (team === ourTeamName) p.ourTeam = true;
        else p.enemyTeam = true;
      }
      for (const event of fight.events) {
        if (event.event_type === "kill" || event.event_type === "mercy_rez") {
          markPresence(event.attacker_hero, event.attacker_team);
          if (event.victim_hero && event.victim_team)
            markPresence(event.victim_hero, event.victim_team);
        }
      }

      const windowStart = fight.start - ABILITY_PRE_BUFFER;
      const windowEnd = fight.end + ABILITY_POST_BUFFER;
      const fightAb1s = ab1s.filter(
        (a) => a.match_time >= windowStart && a.match_time <= windowEnd
      );
      const fightAb2s = ab2s.filter(
        (a) => a.match_time >= windowStart && a.match_time <= windowEnd
      );
      for (const ab of [...fightAb1s, ...fightAb2s])
        markPresence(ab.player_hero, ab.player_team);

      const ourAb1Heroes = new Set<string>(),
        ourAb2Heroes = new Set<string>(),
        enemyAb1Heroes = new Set<string>(),
        enemyAb2Heroes = new Set<string>();
      for (const ab of fightAb1s) {
        if (ab.player_team === ourTeamName) ourAb1Heroes.add(ab.player_hero);
        else enemyAb1Heroes.add(ab.player_hero);
      }
      for (const ab of fightAb2s) {
        if (ab.player_team === ourTeamName) ourAb2Heroes.add(ab.player_hero);
        else enemyAb2Heroes.add(ab.player_hero);
      }

      for (const [hero, presence] of heroPresence) {
        const stats = getOrCreateHero(hero);
        if (presence.ourTeam) {
          stats.ability1.totalFightsAnalyzed++;
          if (ourAb1Heroes.has(hero))
            incrementScenario(stats.ability1.usedByUs, won);
          else incrementScenario(stats.ability1.notUsedByUs, won);
          stats.ability2.totalFightsAnalyzed++;
          if (ourAb2Heroes.has(hero))
            incrementScenario(stats.ability2.usedByUs, won);
          else incrementScenario(stats.ability2.notUsedByUs, won);
        }
        if (presence.enemyTeam) {
          if (enemyAb1Heroes.has(hero))
            incrementScenario(stats.ability1.usedByEnemy, won);
          else incrementScenario(stats.ability1.notUsedByEnemy, won);
          if (enemyAb2Heroes.has(hero))
            incrementScenario(stats.ability2.usedByEnemy, won);
          else incrementScenario(stats.ability2.notUsedByEnemy, won);
        }
      }
    }
  }

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
    .sort(
      (a, b) =>
        Math.max(
          b.ability1.totalFightsAnalyzed,
          b.ability2.totalFightsAnalyzed
        ) -
        Math.max(a.ability1.totalFightsAnalyzed, a.ability2.totalFightsAnalyzed)
    )
    .map((h) => h.hero);
  return { byHero, availableHeroes };
}

export type TeamAbilityImpactServiceInterface = {
  readonly getTeamAbilityImpact: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<AbilityImpactAnalysis, TeamQueryError>;
};

export class TeamAbilityImpactService extends Context.Tag(
  "@app/data/team/TeamAbilityImpactService"
)<TeamAbilityImpactService, TeamAbilityImpactServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getTeamAbilityImpact(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<AbilityImpactAnalysis, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const data = yield* shared.getExtendedTeamData(teamId, { dateRange });

      if (data.mapDataIds.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.hero_count = 0;
        yield* Metric.increment(abilityImpactQuerySuccessTotal);
        const _empty: AbilityImpactAnalysis = {
          byHero: {},
          availableHeroes: [],
        };
        return _empty;
      }

      const [allAbility1Events, allAbility2Events] = yield* Effect.tryPromise({
        try: () =>
          Promise.all([
            prisma.ability1Used.findMany({
              where: { MapDataId: { in: data.mapDataIds } },
              select: {
                match_time: true,
                player_team: true,
                player_hero: true,
                MapDataId: true,
              },
              orderBy: { match_time: "asc" },
            }),
            prisma.ability2Used.findMany({
              where: { MapDataId: { in: data.mapDataIds } },
              select: {
                match_time: true,
                player_team: true,
                player_hero: true,
                MapDataId: true,
              },
              orderBy: { match_time: "asc" },
            }),
          ]),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch ability events",
            cause: error,
          }),
      });

      const result = processAbilityImpactAnalysis(
        data,
        allAbility1Events,
        allAbility2Events
      );
      wideEvent.outcome = "success";
      wideEvent.hero_count = result.availableHeroes.length;
      yield* Metric.increment(abilityImpactQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(abilityImpactQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.abilityImpact.getTeamAbilityImpact")
              : Effect.logInfo("team.abilityImpact.getTeamAbilityImpact");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(
              abilityImpactQueryDuration(Effect.succeed(durationMs))
            )
          );
        })
      ),
      Effect.withSpan("team.abilityImpact.getTeamAbilityImpact")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const abilityImpactCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dateRange = JSON.parse(rest) as TeamDateRange | undefined;
      const dr = dateRange?.from ? dateRange : undefined;
      return getTeamAbilityImpact(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getTeamAbilityImpact: (teamId: number, dateRange?: TeamDateRange) =>
      abilityImpactCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamAbilityImpactServiceInterface;
});

export const TeamAbilityImpactServiceLive = Layer.effect(
  TeamAbilityImpactService,
  make
).pipe(Layer.provide(TeamSharedDataServiceLive));
