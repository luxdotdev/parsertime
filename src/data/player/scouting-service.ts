import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { ScoutingQueryError } from "./errors";
import {
  playerCacheRequestTotal,
  playerCacheMissTotal,
  playerProfileQueryDuration,
  playerProfileQueryErrorTotal,
  playerProfileQuerySuccessTotal,
  scoutingPlayersQueryDuration,
  scoutingPlayersQueryErrorTotal,
  scoutingPlayersQuerySuccessTotal,
} from "./metrics";
import type {
  HeroFrequency,
  PlayerProfile,
  ScoutingPlayerSummary,
  TournamentMatchEntry,
  TournamentRecord,
} from "./types";

function extractSlug(playerUrl: string): string {
  const parts = playerUrl.split("/");
  return parts[parts.length - 1] ?? "";
}

export type ScoutingServiceInterface = {
  readonly getScoutingPlayers: () => Effect.Effect<
    ScoutingPlayerSummary[],
    ScoutingQueryError
  >;

  readonly getPlayerProfile: (
    slug: string
  ) => Effect.Effect<PlayerProfile | null, ScoutingQueryError>;
};

export class ScoutingService extends Context.Tag(
  "@app/data/player/ScoutingService"
)<ScoutingService, ScoutingServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<ScoutingServiceInterface> = Effect.gen(
  function* () {
    function getScoutingPlayers(): Effect.Effect<
      ScoutingPlayerSummary[],
      ScoutingQueryError
    > {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {};

      return Effect.gen(function* () {
        const players = yield* Effect.tryPromise({
          try: () =>
            prisma.scoutingPlayer.findMany({
              select: {
                id: true,
                name: true,
                team: true,
                role: true,
                region: true,
                status: true,
                playerUrl: true,
              },
              orderBy: { name: "asc" },
            }),
          catch: (error) =>
            new ScoutingQueryError({
              operation: "fetch scouting players",
              cause: error,
            }),
        }).pipe(Effect.withSpan("player.scouting.fetchPlayers"));

        const result = players.map((p) => ({
          id: p.id,
          name: p.name,
          team: p.team,
          role: p.role,
          region: p.region,
          status: p.status,
          slug: extractSlug(p.playerUrl),
        }));

        wideEvent.player_count = result.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scoutingPlayersQuerySuccessTotal);
        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(scoutingPlayersQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("player.getScoutingPlayers")
                : Effect.logInfo("player.getScoutingPlayers");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scoutingPlayersQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("player.getScoutingPlayers")
      );
    }

    function getPlayerProfile(
      slug: string
    ): Effect.Effect<PlayerProfile | null, ScoutingQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { slug };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("slug", slug);
        const playerUrl = `https://liquipedia.net/overwatch/${slug}`;

        const player = yield* Effect.tryPromise({
          try: () =>
            prisma.scoutingPlayer.findUnique({
              where: { playerUrl },
            }),
          catch: (error) =>
            new ScoutingQueryError({
              operation: "fetch scouting player by URL",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("player.profile.fetchPlayer", {
            attributes: { slug },
          })
        );

        if (!player) {
          wideEvent.outcome = "success";
          wideEvent.found = false;
          yield* Metric.increment(playerProfileQuerySuccessTotal);
          return null;
        }

        const [heroAssignments, rosterEntries] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.scoutingHeroAssignment.findMany({
                where: {
                  playerName: { equals: player.name, mode: "insensitive" },
                },
                select: {
                  heroName: true,
                  mapResultId: true,
                  team: true,
                  mapResult: {
                    select: {
                      mapName: true,
                      match: {
                        select: {
                          matchDate: true,
                          team1: true,
                          team1FullName: true,
                          team2: true,
                          team2FullName: true,
                          team1Score: true,
                          team2Score: true,
                          winner: true,
                          tournament: { select: { title: true } },
                        },
                      },
                    },
                  },
                },
              }),
              prisma.scoutingRosterPlayer.findMany({
                where: {
                  displayName: { equals: player.name, mode: "insensitive" },
                },
                select: {
                  role: true,
                  didNotPlay: true,
                  roster: {
                    select: {
                      teamName: true,
                      tournament: {
                        select: {
                          id: true,
                          title: true,
                        },
                      },
                    },
                  },
                },
              }),
            ]),
          catch: (error) =>
            new ScoutingQueryError({
              operation: "fetch hero assignments and roster entries",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("player.profile.fetchAssignmentsAndRoster", {
            attributes: { slug, playerName: player.name },
          })
        );

        const heroCountMap = new Map<string, Set<number>>();
        for (const assignment of heroAssignments) {
          const existing = heroCountMap.get(assignment.heroName) ?? new Set();
          existing.add(assignment.mapResultId);
          heroCountMap.set(assignment.heroName, existing);
        }

        const heroFrequencies: HeroFrequency[] = Array.from(
          heroCountMap.entries()
        )
          .map(([hero, mapIds]) => ({ hero, mapCount: mapIds.size }))
          .sort((a, b) => b.mapCount - a.mapCount);

        const competitiveMapCount = new Set(
          heroAssignments.map((a) => a.mapResultId)
        ).size;

        const tournamentMap = new Map<
          string,
          {
            tournamentTitle: string;
            teamName: string;
            role: string;
            matchMap: Map<
              string,
              {
                date: Date;
                opponent: string;
                opponentFullName: string;
                teamScore: number | null;
                opponentScore: number | null;
                result: "win" | "loss";
                heroesPlayed: Set<string>;
              }
            >;
          }
        >();

        const rosterTournamentIds = new Set<number>();
        const rosterTeamsByTournament = new Map<
          number,
          { teamName: string; tournamentTitle: string; role: string }
        >();

        for (const entry of rosterEntries) {
          const tournamentId = entry.roster.tournament.id;
          const tournamentTitle = entry.roster.tournament.title;
          const teamName = entry.roster.teamName;

          rosterTournamentIds.add(tournamentId);
          rosterTeamsByTournament.set(tournamentId, {
            teamName,
            tournamentTitle,
            role: entry.role,
          });

          if (!tournamentMap.has(tournamentTitle)) {
            tournamentMap.set(tournamentTitle, {
              tournamentTitle,
              teamName,
              role: entry.role,
              matchMap: new Map(),
            });
          }
        }

        if (rosterTournamentIds.size > 0) {
          const rosterMatches = yield* Effect.tryPromise({
            try: () =>
              prisma.scoutingMatch.findMany({
                where: {
                  tournamentId: {
                    in: Array.from(rosterTournamentIds),
                  },
                },
                select: {
                  matchDate: true,
                  team1: true,
                  team1FullName: true,
                  team2: true,
                  team2FullName: true,
                  team1Score: true,
                  team2Score: true,
                  winner: true,
                  tournamentId: true,
                  tournament: { select: { title: true } },
                },
                orderBy: { matchDate: "desc" },
              }),
            catch: (error) =>
              new ScoutingQueryError({
                operation: "fetch roster tournament matches",
                cause: error,
              }),
          }).pipe(
            Effect.withSpan("player.profile.fetchRosterMatches", {
              attributes: {
                slug,
                tournamentCount: rosterTournamentIds.size,
              },
            })
          );

          for (const match of rosterMatches) {
            const rosterInfo = rosterTeamsByTournament.get(match.tournamentId);
            if (!rosterInfo) continue;

            const isTeam1 =
              match.team1 === rosterInfo.teamName ||
              match.team1FullName === rosterInfo.teamName;
            const isTeam2 =
              match.team2 === rosterInfo.teamName ||
              match.team2FullName === rosterInfo.teamName;
            if (!isTeam1 && !isTeam2) continue;

            const onTeam1Side = isTeam1;
            const teamAbbr = onTeam1Side ? match.team1 : match.team2;

            const tournament = tournamentMap.get(rosterInfo.tournamentTitle);
            if (!tournament) continue;

            const matchKey = `${match.team1}-${match.team2}-${match.matchDate.toISOString()}`;
            if (!tournament.matchMap.has(matchKey)) {
              const won = match.winner === teamAbbr;
              tournament.matchMap.set(matchKey, {
                date: match.matchDate,
                opponent: onTeam1Side ? match.team2 : match.team1,
                opponentFullName: onTeam1Side
                  ? match.team2FullName
                  : match.team1FullName,
                teamScore: onTeam1Side ? match.team1Score : match.team2Score,
                opponentScore: onTeam1Side
                  ? match.team2Score
                  : match.team1Score,
                result: won ? "win" : "loss",
                heroesPlayed: new Set<string>(),
              });
            }
          }
        }

        for (const assignment of heroAssignments) {
          const match = assignment.mapResult.match;
          const tournamentTitle = match.tournament.title;
          const isTeam1 = assignment.team === "team1";
          const teamAbbr = isTeam1 ? match.team1 : match.team2;

          if (!tournamentMap.has(tournamentTitle)) {
            const rosterEntry = rosterEntries.find(
              (r) => r.roster.tournament.title === tournamentTitle
            );
            tournamentMap.set(tournamentTitle, {
              tournamentTitle,
              teamName: teamAbbr,
              role: rosterEntry?.role ?? player.role,
              matchMap: new Map(),
            });
          }

          const tournament = tournamentMap.get(tournamentTitle)!;
          const matchKey = `${match.team1}-${match.team2}-${match.matchDate.toISOString()}`;

          if (!tournament.matchMap.has(matchKey)) {
            const won = match.winner === teamAbbr;
            tournament.matchMap.set(matchKey, {
              date: match.matchDate,
              opponent: isTeam1 ? match.team2 : match.team1,
              opponentFullName: isTeam1
                ? match.team2FullName
                : match.team1FullName,
              teamScore: isTeam1 ? match.team1Score : match.team2Score,
              opponentScore: isTeam1 ? match.team2Score : match.team1Score,
              result: won ? "win" : "loss",
              heroesPlayed: new Set<string>(),
            });
          }

          tournament.matchMap
            .get(matchKey)!
            .heroesPlayed.add(assignment.heroName);
        }

        const tournamentRecords: TournamentRecord[] = Array.from(
          tournamentMap.values()
        )
          .map((t) => {
            const matches: TournamentMatchEntry[] = Array.from(
              t.matchMap.values()
            )
              .map((m) => ({
                date: m.date,
                opponent: m.opponent,
                opponentFullName: m.opponentFullName,
                teamScore: m.teamScore,
                opponentScore: m.opponentScore,
                result: m.result,
                heroesPlayed: Array.from(m.heroesPlayed),
              }))
              .sort((a, b) => b.date.getTime() - a.date.getTime());

            const wins = matches.filter((m) => m.result === "win").length;
            const losses = matches.length - wins;

            return {
              tournamentTitle: t.tournamentTitle,
              teamName: t.teamName,
              role: t.role,
              wins,
              losses,
              winRate: matches.length > 0 ? (wins / matches.length) * 100 : 0,
              matches,
            };
          })
          .sort((a, b) => {
            const aDate = a.matches[0]?.date.getTime() ?? 0;
            const bDate = b.matches[0]?.date.getTime() ?? 0;
            return bDate - aDate;
          });

        wideEvent.found = true;
        wideEvent.hero_frequency_count = heroFrequencies.length;
        wideEvent.competitive_map_count = competitiveMapCount;
        wideEvent.tournament_count = tournamentRecords.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(playerProfileQuerySuccessTotal);

        return {
          id: player.id,
          name: player.name,
          team: player.team,
          status: player.status,
          role: player.role,
          country: player.country,
          signatureHeroes: player.signatureHeroes,
          winnings: player.winnings,
          region: player.region,
          playerUrl: player.playerUrl,
          slug: extractSlug(player.playerUrl),
          heroFrequencies,
          competitiveMapCount,
          tournamentRecords,
          totalTournaments: tournamentRecords.length,
        };
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(playerProfileQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("player.getPlayerProfile")
                : Effect.logInfo("player.getPlayerProfile");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                playerProfileQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("player.getPlayerProfile")
      );
    }

    const scoutingPlayersCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (_: void) =>
        getScoutingPlayers().pipe(
          Effect.tap(() => Metric.increment(playerCacheMissTotal))
        ),
    });

    const playerProfileCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (slug: string) =>
        getPlayerProfile(slug).pipe(
          Effect.tap(() => Metric.increment(playerCacheMissTotal))
        ),
    });

    return {
      getScoutingPlayers: () =>
        scoutingPlayersCache
          .get(undefined as void)
          .pipe(Effect.tap(() => Metric.increment(playerCacheRequestTotal))),
      getPlayerProfile: (slug: string) =>
        playerProfileCache
          .get(slug)
          .pipe(Effect.tap(() => Metric.increment(playerCacheRequestTotal))),
    } satisfies ScoutingServiceInterface;
  }
);

export const ScoutingServiceLive = Layer.effect(ScoutingService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
