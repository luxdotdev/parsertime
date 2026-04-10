import { EffectObservabilityLive } from "@/instrumentation";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "@/data/team/shared-data-service";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import {
  groupEventsIntoFights,
  mercyRezToKillEvent,
  removeDuplicateRows,
  type Fight,
} from "@/lib/utils";
import type { AbilityImpact } from "@/types/heroes";
import { allHeroes } from "@/types/heroes";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { ScrimQueryError } from "./errors";
import {
  scrimAbilityTimingDuration,
  scrimAbilityTimingErrorTotal,
  scrimAbilityTimingSuccessTotal,
  scrimCacheRequestTotal,
  scrimCacheMissTotal,
  scrimFightTimelinesDuration,
  scrimFightTimelinesErrorTotal,
  scrimFightTimelinesSuccessTotal,
  scrimMapAbilityTimingDuration,
  scrimMapAbilityTimingErrorTotal,
  scrimMapAbilityTimingSuccessTotal,
} from "./metrics";
import type {
  FightPhase,
  AbilityPhaseStats,
  AbilityTimingRow,
  AbilityTimingOutlier,
  AbilityTimingAnalysis,
  FightAbilityEvent,
  FightKillEvent,
  FightTimeline,
  ScrimFightTimelines,
  MapAbilityTimingAnalysis,
} from "./types";

export type {
  FightPhase,
  AbilityPhaseStats,
  AbilityTimingRow,
  AbilityTimingOutlier,
  AbilityTimingAnalysis,
  FightAbilityEvent,
  FightKillEvent,
  FightTimeline,
  ScrimFightTimelines,
  MapAbilityTimingAnalysis,
} from "./types";

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

export type ScrimAbilityTimingServiceInterface = {
  readonly getScrimAbilityTiming: (
    scrimId: number,
    teamId: number
  ) => Effect.Effect<AbilityTimingAnalysis, ScrimQueryError>;

  readonly getScrimFightTimelines: (
    scrimId: number,
    teamId: number
  ) => Effect.Effect<ScrimFightTimelines, ScrimQueryError>;

  readonly getMapAbilityTiming: (
    mapId: number,
    team1Name: string,
    team2Name: string
  ) => Effect.Effect<MapAbilityTimingAnalysis, ScrimQueryError>;
};

export class ScrimAbilityTimingService extends Context.Tag(
  "@app/data/scrim/ScrimAbilityTimingService"
)<ScrimAbilityTimingService, ScrimAbilityTimingServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<
  ScrimAbilityTimingServiceInterface,
  never,
  TeamSharedDataService
> = Effect.gen(function* () {
  const teamSharedData = yield* TeamSharedDataService;

  function getScrimAbilityTiming(
    scrimId: number,
    teamId: number
  ): Effect.Effect<AbilityTimingAnalysis, ScrimQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = { scrimId, teamId };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("scrimId", scrimId);
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const maps = yield* Effect.tryPromise({
        try: () =>
          prisma.map.findMany({
            where: { scrimId },
            orderBy: { id: "asc" },
            select: { id: true, mapData: { select: { id: true } } },
          }),
        catch: (error) =>
          new ScrimQueryError({
            operation: "getScrimAbilityTiming.fetchMaps",
            cause: error,
          }),
      }).pipe(
        Effect.withSpan("scrim.abilityTiming.fetchMaps", {
          attributes: { scrimId },
        })
      );

      if (maps.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_maps";
        yield* Metric.increment(scrimAbilityTimingSuccessTotal);
        return { rows: [], outliers: [] };
      }

      const mapIds = maps.flatMap((m) => m.mapData.map((md) => md.id));
      wideEvent.map_count = maps.length;
      wideEvent.map_data_count = mapIds.length;

      const teamRosterArr = yield* teamSharedData.getTeamRoster(teamId).pipe(
        Effect.mapError(
          (error) =>
            new ScrimQueryError({
              operation: "getScrimAbilityTiming.fetchRoster",
              cause: error,
            })
        )
      );

      const [allKills, allRezzes, allAbility1, allAbility2] =
        yield* Effect.tryPromise({
          try: () =>
            Promise.all([
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
            ]),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getScrimAbilityTiming.fetchData",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.abilityTiming.fetchData", {
            attributes: { scrimId, teamId, mapCount: mapIds.length },
          })
        );

      const teamRoster = new Set(teamRosterArr);

      const dedupedKills = removeDuplicateRows(allKills);
      const killEvents = [
        ...dedupedKills,
        ...allRezzes.map(mercyRezToKillEvent),
      ].sort((a, b) => a.match_time - b.match_time);

      const fights = groupEventsIntoFights(killEvents);

      if (fights.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_fights";
        yield* Metric.increment(scrimAbilityTimingSuccessTotal);
        return { rows: [], outliers: [] };
      }

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

      if (!ourTeamName) {
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_team_name";
        yield* Metric.increment(scrimAbilityTimingSuccessTotal);
        return { rows: [], outliers: [] };
      }

      wideEvent.fight_count = fights.length;
      wideEvent.our_team_name = ourTeamName;

      const result = processAbilityTimingAnalysis(
        fights,
        allAbility1,
        allAbility2,
        ourTeamName
      );

      wideEvent.row_count = result.rows.length;
      wideEvent.outlier_count = result.outliers.length;
      wideEvent.outcome = "success";
      yield* Metric.increment(scrimAbilityTimingSuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(scrimAbilityTimingErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("scrim.getScrimAbilityTiming")
              : Effect.logInfo("scrim.getScrimAbilityTiming");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(
              scrimAbilityTimingDuration(Effect.succeed(durationMs))
            )
          );
        })
      ),
      Effect.withSpan("scrim.getScrimAbilityTiming")
    );
  }

  function getScrimFightTimelines(
    scrimId: number,
    teamId: number
  ): Effect.Effect<ScrimFightTimelines, ScrimQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = { scrimId, teamId };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("scrimId", scrimId);
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const maps = yield* Effect.tryPromise({
        try: () =>
          prisma.map.findMany({
            where: { scrimId },
            orderBy: { id: "asc" },
            select: { id: true, mapData: { select: { id: true } } },
          }),
        catch: (error) =>
          new ScrimQueryError({
            operation: "getScrimFightTimelines.fetchMaps",
            cause: error,
          }),
      }).pipe(
        Effect.withSpan("scrim.fightTimelines.fetchMaps", {
          attributes: { scrimId },
        })
      );

      if (maps.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_maps";
        yield* Metric.increment(scrimFightTimelinesSuccessTotal);
        return { fights: [], ourTeamName: "" };
      }

      const mapIds = maps.flatMap((m) => m.mapData.map((md) => md.id));
      wideEvent.map_count = maps.length;

      const teamRosterArr = yield* teamSharedData.getTeamRoster(teamId).pipe(
        Effect.mapError(
          (error) =>
            new ScrimQueryError({
              operation: "getScrimFightTimelines.fetchRoster",
              cause: error,
            })
        )
      );

      const [allKills, allRezzes, allAbility1, allAbility2] =
        yield* Effect.tryPromise({
          try: () =>
            Promise.all([
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
                  player_name: true,
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
                  player_name: true,
                  MapDataId: true,
                },
                orderBy: { match_time: "asc" },
              }),
            ]),
          catch: (error) =>
            new ScrimQueryError({
              operation: "getScrimFightTimelines.fetchData",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.fightTimelines.fetchData", {
            attributes: { scrimId, teamId, mapCount: mapIds.length },
          })
        );

      const teamRoster = new Set(teamRosterArr);

      const dedupedKills = removeDuplicateRows(allKills);
      const killEvents = [
        ...dedupedKills,
        ...allRezzes.map(mercyRezToKillEvent),
      ].sort((a, b) => a.match_time - b.match_time);

      const fights = groupEventsIntoFights(killEvents);

      if (fights.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_fights";
        yield* Metric.increment(scrimFightTimelinesSuccessTotal);
        return { fights: [], ourTeamName: "" };
      }

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

      if (!ourTeamName) {
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_team_name";
        yield* Metric.increment(scrimFightTimelinesSuccessTotal);
        return { fights: [], ourTeamName: "" };
      }

      wideEvent.fight_count = fights.length;

      const timelines: FightTimeline[] = fights.map((fight, idx) => {
        const outcome = determineFightOutcome(fight, ourTeamName);

        const kills: FightKillEvent[] = fight.kills
          .filter((k) => k.event_type === "kill")
          .map((k) => ({
            time: Math.round(k.match_time * 10) / 10,
            attacker: k.attacker_name,
            attackerHero: k.attacker_hero,
            victim: k.victim_name,
            victimHero: k.victim_hero,
            attackerSide:
              k.attacker_team === ourTeamName
                ? ("ours" as const)
                : ("enemy" as const),
          }));

        const windowStart = fight.start - PRE_FIGHT_BUFFER;
        const windowEnd = fight.end + CLEANUP_BUFFER;

        function mapAbilityEvents(
          events: {
            match_time: number;
            player_team: string;
            player_hero: string;
            player_name: string;
            MapDataId: number | null;
          }[],
          slot: 1 | 2
        ): FightAbilityEvent[] {
          return events
            .filter(
              (e) => e.match_time >= windowStart && e.match_time <= windowEnd
            )
            .map((e) => {
              const heroDef = heroAbilityLookup.get(e.player_hero);
              const abilityDef =
                slot === 1 ? heroDef?.ability1 : heroDef?.ability2;
              const phase = classifyPhase(e.match_time, fight);

              return {
                time: Math.round(e.match_time * 10) / 10,
                hero: e.player_hero,
                ability: abilityDef?.name ?? `ability${slot}`,
                abilitySlot: slot,
                team:
                  e.player_team === ourTeamName
                    ? ("ours" as const)
                    : ("enemy" as const),
                phase: phase ?? ("mid" as FightPhase),
              };
            });
        }

        const abilityUses = [
          ...mapAbilityEvents(allAbility1, 1),
          ...mapAbilityEvents(allAbility2, 2),
        ].sort((a, b) => a.time - b.time);

        return {
          fightNumber: idx + 1,
          startTime: Math.round(fight.start * 10) / 10,
          endTime: Math.round(fight.end * 10) / 10,
          duration: Math.round((fight.end - fight.start) * 10) / 10,
          outcome,
          kills,
          abilityUses,
        };
      });

      wideEvent.timeline_count = timelines.length;
      wideEvent.outcome = "success";
      yield* Metric.increment(scrimFightTimelinesSuccessTotal);
      return { fights: timelines, ourTeamName };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(scrimFightTimelinesErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("scrim.getScrimFightTimelines")
              : Effect.logInfo("scrim.getScrimFightTimelines");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(
              scrimFightTimelinesDuration(Effect.succeed(durationMs))
            )
          );
        })
      ),
      Effect.withSpan("scrim.getScrimFightTimelines")
    );
  }

  function getMapAbilityTiming(
    mapId: number,
    team1Name: string,
    team2Name: string
  ): Effect.Effect<MapAbilityTimingAnalysis, ScrimQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      mapId,
      team1Name,
      team2Name,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("mapId", mapId);
      yield* Effect.annotateCurrentSpan("team1Name", team1Name);
      yield* Effect.annotateCurrentSpan("team2Name", team2Name);
      const empty: MapAbilityTimingAnalysis = {
        team1: { rows: [], outliers: [] },
        team2: { rows: [], outliers: [] },
      };

      const mapDataId = yield* Effect.tryPromise({
        try: () => resolveMapDataId(mapId),
        catch: (error) =>
          new ScrimQueryError({
            operation: "getMapAbilityTiming.resolveMapDataId",
            cause: error,
          }),
      }).pipe(
        Effect.withSpan("scrim.mapAbilityTiming.resolveMapDataId", {
          attributes: { mapId },
        })
      );

      wideEvent.mapDataId = mapDataId;

      const [allKills, allRezzes, allAbility1, allAbility2] =
        yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.kill.findMany({
                where: { MapDataId: mapDataId },
                orderBy: { match_time: "asc" },
              }),
              prisma.mercyRez.findMany({
                where: { MapDataId: mapDataId },
                orderBy: { match_time: "asc" },
              }),
              prisma.ability1Used.findMany({
                where: { MapDataId: mapDataId },
                select: {
                  match_time: true,
                  player_team: true,
                  player_hero: true,
                  MapDataId: true,
                },
                orderBy: { match_time: "asc" },
              }),
              prisma.ability2Used.findMany({
                where: { MapDataId: mapDataId },
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
            new ScrimQueryError({
              operation: "getMapAbilityTiming.fetchData",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scrim.mapAbilityTiming.fetchData", {
            attributes: { mapId, mapDataId },
          })
        );

      if (allAbility1.length === 0 && allAbility2.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_ability_data";
        yield* Metric.increment(scrimMapAbilityTimingSuccessTotal);
        return empty;
      }

      const dedupedKills = removeDuplicateRows(allKills);
      const killEvents = [
        ...dedupedKills,
        ...allRezzes.map(mercyRezToKillEvent),
      ].sort((a, b) => a.match_time - b.match_time);

      const fights = groupEventsIntoFights(killEvents);

      if (fights.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_fights";
        yield* Metric.increment(scrimMapAbilityTimingSuccessTotal);
        return empty;
      }

      wideEvent.fight_count = fights.length;

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

      wideEvent.team1_rows = team1Analysis.rows.length;
      wideEvent.team2_rows = team2Analysis.rows.length;
      wideEvent.outcome = "success";
      yield* Metric.increment(scrimMapAbilityTimingSuccessTotal);
      return { team1: team1Analysis, team2: team2Analysis };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(
          Effect.andThen(Metric.increment(scrimMapAbilityTimingErrorTotal))
        )
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("scrim.getMapAbilityTiming")
              : Effect.logInfo("scrim.getMapAbilityTiming");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(
              scrimMapAbilityTimingDuration(Effect.succeed(durationMs))
            )
          );
        })
      ),
      Effect.withSpan("scrim.getMapAbilityTiming")
    );
  }

  function abilityTimingCacheKeyOf(scrimId: number, teamId: number) {
    return JSON.stringify({ scrimId, teamId });
  }

  const abilityTimingCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const { scrimId, teamId } = JSON.parse(key) as {
        scrimId: number;
        teamId: number;
      };
      return getScrimAbilityTiming(scrimId, teamId).pipe(
        Effect.tap(() => Metric.increment(scrimCacheMissTotal))
      );
    },
  });

  function fightTimelinesCacheKeyOf(scrimId: number, teamId: number) {
    return JSON.stringify({ scrimId, teamId });
  }

  const fightTimelinesCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const { scrimId, teamId } = JSON.parse(key) as {
        scrimId: number;
        teamId: number;
      };
      return getScrimFightTimelines(scrimId, teamId).pipe(
        Effect.tap(() => Metric.increment(scrimCacheMissTotal))
      );
    },
  });

  function mapAbilityTimingCacheKeyOf(
    mapId: number,
    team1Name: string,
    team2Name: string
  ) {
    return JSON.stringify({ mapId, team1Name, team2Name });
  }

  const mapAbilityTimingCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const { mapId, team1Name, team2Name } = JSON.parse(key) as {
        mapId: number;
        team1Name: string;
        team2Name: string;
      };
      return getMapAbilityTiming(mapId, team1Name, team2Name).pipe(
        Effect.tap(() => Metric.increment(scrimCacheMissTotal))
      );
    },
  });

  return {
    getScrimAbilityTiming: (scrimId: number, teamId: number) =>
      abilityTimingCache
        .get(abilityTimingCacheKeyOf(scrimId, teamId))
        .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
    getScrimFightTimelines: (scrimId: number, teamId: number) =>
      fightTimelinesCache
        .get(fightTimelinesCacheKeyOf(scrimId, teamId))
        .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
    getMapAbilityTiming: (
      mapId: number,
      team1Name: string,
      team2Name: string
    ) =>
      mapAbilityTimingCache
        .get(mapAbilityTimingCacheKeyOf(mapId, team1Name, team2Name))
        .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
  } satisfies ScrimAbilityTimingServiceInterface;
});

export const ScrimAbilityTimingServiceLive = Layer.effect(
  ScrimAbilityTimingService,
  make
).pipe(
  Layer.provide(TeamSharedDataServiceLive),
  Layer.provide(EffectObservabilityLive)
);
