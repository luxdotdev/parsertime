import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { FaceitScoutingQueryError } from "./errors";
import {
  faceitCacheMissTotal,
  faceitCacheRequestTotal,
  faceitTeamProfileQueryDuration,
  faceitTeamProfileQueryErrorTotal,
  faceitTeamProfileQuerySuccessTotal,
  faceitTeamsQueryDuration,
  faceitTeamsQueryErrorTotal,
  faceitTeamsQuerySuccessTotal,
} from "./metrics";
import {
  buildOverview,
  buildRecommendations,
  heroBanEnvironment,
  mapWinrates,
  attackDefenseSplit,
  rankRelatedTeams,
  rosterStrength,
  STARTER_SHARE,
} from "./aggregations";
import type {
  FaceitRoleKey,
  FaceitRosterPlayer,
  FaceitTeamListEntry,
  FaceitTeamMapRow,
  FaceitTeamMatchRow,
  FaceitTeamProfile,
  RelatedTeam,
} from "./types";

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;
const CORE_SIZE = 5;
const RELATED_MIN_SHARED = 4;

type TeamListRow = { faceit_team_id: string; name: string; match_count: bigint };

export type FaceitTeamScoutingServiceInterface = {
  readonly getFaceitTeams: () => Effect.Effect<FaceitTeamListEntry[], FaceitScoutingQueryError>;
  readonly getFaceitTeamProfile: (
    teamId: string,
    opts?: { combined?: boolean }
  ) => Effect.Effect<FaceitTeamProfile | null, FaceitScoutingQueryError>;
};

export class FaceitTeamScoutingService extends Context.Tag(
  "@app/data/faceit/FaceitTeamScoutingService"
)<FaceitTeamScoutingService, FaceitTeamScoutingServiceInterface>() {}

export const make: Effect.Effect<FaceitTeamScoutingServiceInterface> = Effect.gen(function* () {
  // --- search list: distinct team, most-recent name, match count ---
  function getFaceitTeams(): Effect.Effect<FaceitTeamListEntry[], FaceitScoutingQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {};
    return Effect.gen(function* () {
      const rows = yield* Effect.tryPromise({
        try: () => prisma.$queryRaw<TeamListRow[]>`
          WITH latest AS (
            SELECT mt."faceitTeamId" AS faceit_team_id, mt."teamName" AS name,
                   ROW_NUMBER() OVER (PARTITION BY mt."faceitTeamId" ORDER BY m."finishedAt" DESC) rn,
                   COUNT(*) OVER (PARTITION BY mt."faceitTeamId") AS match_count
            FROM "FaceitMatchTeam" mt
            JOIN "FaceitMatch" m ON m."faceitMatchId" = mt."matchId"
            WHERE mt."faceitTeamId" IS NOT NULL
          )
          SELECT faceit_team_id, name, match_count::bigint
          FROM latest WHERE rn = 1 ORDER BY match_count DESC
        `,
        catch: (error) => new FaceitScoutingQueryError({ operation: "fetch faceit teams", cause: error }),
      }).pipe(Effect.withSpan("faceit.teams.fetchRows"));
      const teams: FaceitTeamListEntry[] = rows.map((r) => ({
        faceitTeamId: r.faceit_team_id,
        name: r.name,
        matchCount: Number(r.match_count),
      }));
      wideEvent.team_count = teams.length;
      wideEvent.outcome = "success";
      yield* Metric.increment(faceitTeamsQuerySuccessTotal);
      return teams;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
        }).pipe(Effect.andThen(Metric.increment(faceitTeamsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log = wideEvent.outcome === "error"
            ? Effect.logError("faceit.getFaceitTeams")
            : Effect.logInfo("faceit.getFaceitTeams");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(faceitTeamsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("faceit.getFaceitTeams")
    );
  }

  // --- profile ---
  function getFaceitTeamProfile(
    teamId: string,
    opts?: { combined?: boolean }
  ): Effect.Effect<FaceitTeamProfile | null, FaceitScoutingQueryError> {
    const combined = opts?.combined ?? false;
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = { team_id: teamId, combined };
    return Effect.gen(function* () {
      const related = yield* fetchRelatedTeams(teamId);
      const includedTeamIds = combined
        ? [teamId, ...related.map((r) => r.faceitTeamId)]
        : [teamId];

      // Fetch this team's name (most recent).
      const nameRow = yield* Effect.tryPromise({
        try: () => prisma.$queryRaw<{ name: string }[]>`
          SELECT mt."teamName" AS name
          FROM "FaceitMatchTeam" mt
          JOIN "FaceitMatch" m ON m."faceitMatchId" = mt."matchId"
          WHERE mt."faceitTeamId" = ${teamId}
          ORDER BY m."finishedAt" DESC LIMIT 1
        `,
        catch: (error) => new FaceitScoutingQueryError({ operation: "fetch team name", cause: error }),
      });
      if (nameRow.length === 0) {
        wideEvent.outcome = "not_found";
        return null;
      }

      // In combined mode, keep ALL of the scouted team's own matches, but pull
      // in a related team's matches only when the scouted team's core players
      // actually played in them. A related team id can be reused across
      // entirely different lineups; without this, combining drags in off-roster
      // matches. Uses the same ≥N-shared bar that made the teams "related".
      const coreFilter = combined
        ? {
            scoutedTeamId: teamId,
            players: yield* fetchCorePlayers(teamId),
            minShared: RELATED_MIN_SHARED,
          }
        : null;

      const { matchRows, mapRows, roster } = yield* fetchTeamData(
        includedTeamIds,
        coreFilter
      );

      const overview = buildOverview(matchRows);
      const { byMap, byType } = mapWinrates(mapRows);
      const mapAnalysis = { byMap, byType, attackDefense: attackDefenseSplit(mapRows) };
      const banEnv = heroBanEnvironment(mapRows);
      const strength = rosterStrength(roster);
      const recommendations = buildRecommendations({ byMap, heroBanEnvironment: banEnv });

      wideEvent.match_count = matchRows.length;
      wideEvent.outcome = "success";
      yield* Metric.increment(faceitTeamProfileQuerySuccessTotal);
      return {
        team: { faceitTeamId: teamId, name: nameRow[0]?.name ?? "" },
        combined,
        includedTeamIds,
        overview,
        strength,
        mapAnalysis,
        heroBanEnvironment: banEnv,
        roster,
        relatedTeams: rankRelatedTeams(related),
        recommendations,
      } satisfies FaceitTeamProfile;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
        }).pipe(Effect.andThen(Metric.increment(faceitTeamProfileQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log = wideEvent.outcome === "error"
            ? Effect.logError("faceit.getFaceitTeamProfile")
            : Effect.logInfo("faceit.getFaceitTeamProfile");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(faceitTeamProfileQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("faceit.getFaceitTeamProfile")
    );
  }

  // --- helpers (raw fetches; mapping to normalized rows) ---
  type RawMapRow = {
    match_id: string; finished_at: Date; tier: string; team_side: number;
    map_name: string | null; map_type: string | null; winner_faction: number | null;
    attacking_first: string | null; hero_bans: string[] | null;
  };
  type RawMatchRow = { match_id: string; finished_at: Date; tier: string; won: boolean };
  type RawRosterRow = {
    faceit_player_id: string; nickname: string; battletag: string | null;
    role: string | null; appearances: bigint; total_matches: bigint; fsr: number | null; tsr: number | null;
  };

  function fetchTeamData(
    teamIds: string[],
    coreFilter: { scoutedTeamId: string; players: string[]; minShared: number } | null
  ) {
    const ids = teamIds.length > 0 ? teamIds : [""];
    // Optional clause: always keep the scouted team's own rows; keep a related
    // team's row only when its chosen-side roster contains at least `minShared`
    // of the scouted team's core players.
    const coreClause =
      coreFilter && coreFilter.players.length > 0
        ? Prisma.sql`AND (mt."faceitTeamId" = ${coreFilter.scoutedTeamId} OR (
            SELECT COUNT(*) FROM "FaceitMatchRoster" rf
            WHERE rf."matchId" = mt."matchId" AND rf."teamSide" = mt."teamSide"
              AND rf."faceitPlayerId" IN (${Prisma.join(coreFilter.players)})
          ) >= ${coreFilter.minShared})`
        : Prisma.empty;
    return Effect.tryPromise({
      try: async () => {
        const matchRowsRaw = await prisma.$queryRaw<RawMatchRow[]>(
          Prisma.sql`
          WITH chosen AS (
            SELECT DISTINCT ON (mt."matchId") mt."matchId", mt."teamSide", mt.winner
            FROM "FaceitMatchTeam" mt
            WHERE mt."faceitTeamId" IN (${Prisma.join(ids)})
            ${coreClause}
            ORDER BY mt."matchId", array_position(ARRAY[${Prisma.join(ids)}]::text[], mt."faceitTeamId")
          )
          SELECT ch."matchId" AS match_id, m."finishedAt" AS finished_at, c.tier::text AS tier, ch.winner AS won
          FROM chosen ch
          JOIN "FaceitMatch" m ON m."faceitMatchId" = ch."matchId"
          JOIN "FaceitChampionship" c ON c."championshipId" = m."championshipId"`
        );
        const mapRowsRaw = await prisma.$queryRaw<RawMapRow[]>(
          Prisma.sql`
          WITH chosen AS (
            SELECT DISTINCT ON (mt."matchId") mt."matchId", mt."teamSide", mt.winner
            FROM "FaceitMatchTeam" mt
            WHERE mt."faceitTeamId" IN (${Prisma.join(ids)})
            ${coreClause}
            ORDER BY mt."matchId", array_position(ARRAY[${Prisma.join(ids)}]::text[], mt."faceitTeamId")
          )
          SELECT ch."matchId" AS match_id, m."finishedAt" AS finished_at, c.tier::text AS tier,
                 ch."teamSide" AS team_side, mm."mapName" AS map_name, mm."mapType"::text AS map_type,
                 mm."winnerFaction" AS winner_faction, mm."attackingFirstFaction" AS attacking_first,
                 ARRAY(SELECT hb."heroName" FROM "FaceitHeroBan" hb WHERE hb."faceitMapId" = mm.id) AS hero_bans
          FROM chosen ch
          JOIN "FaceitMatch" m ON m."faceitMatchId" = ch."matchId"
          JOIN "FaceitChampionship" c ON c."championshipId" = m."championshipId"
          JOIN "FaceitMatchMap" mm ON mm."matchId" = ch."matchId"
          WHERE mm."winnerFaction" IS NOT NULL`
        );
        const rosterRaw = await prisma.$queryRaw<RawRosterRow[]>(
          Prisma.sql`
          WITH chosen AS (
            SELECT DISTINCT ON (mt."matchId") mt."matchId", mt."teamSide"
            FROM "FaceitMatchTeam" mt
            WHERE mt."faceitTeamId" IN (${Prisma.join(ids)})
            ${coreClause}
            ORDER BY mt."matchId", array_position(ARRAY[${Prisma.join(ids)}]::text[], mt."faceitTeamId")
          ),
          appear AS (
            SELECT r."faceitPlayerId", COUNT(*)::bigint AS appearances
            FROM chosen ch
            JOIN "FaceitMatchRoster" r ON r."matchId" = ch."matchId" AND r."teamSide" = ch."teamSide"
            GROUP BY r."faceitPlayerId"
          ),
          tot AS (SELECT COUNT(*)::bigint AS total_matches FROM chosen)
          SELECT a."faceitPlayerId" AS faceit_player_id, p."faceitNickname" AS nickname, p.battletag,
                 (SELECT pf.role::text FROM "PlayerFsr" pf WHERE pf."faceitPlayerId" = a."faceitPlayerId" ORDER BY pf."mapCount" DESC LIMIT 1) AS role,
                 a.appearances, (SELECT total_matches FROM tot) AS total_matches,
                 (SELECT pf.fsr FROM "PlayerFsr" pf WHERE pf."faceitPlayerId" = a."faceitPlayerId" ORDER BY pf."mapCount" DESC LIMIT 1) AS fsr,
                 pt.rating AS tsr
          FROM appear a
          JOIN "FaceitPlayer" p ON p."faceitPlayerId" = a."faceitPlayerId"
          LEFT JOIN "PlayerTsr" pt ON pt."faceitPlayerId" = a."faceitPlayerId"
          ORDER BY a.appearances DESC`
        );
        return { matchRowsRaw, mapRowsRaw, rosterRaw };
      },
      catch: (error) => new FaceitScoutingQueryError({ operation: "fetch team data", cause: error }),
    }).pipe(
      Effect.map(({ matchRowsRaw, mapRowsRaw, rosterRaw }) => {
        const matchRows: FaceitTeamMatchRow[] = matchRowsRaw.map((r) => ({
          matchId: r.match_id, finishedAt: r.finished_at, tier: r.tier as FaceitTeamMatchRow["tier"], won: r.won,
        }));
        const mapRows: FaceitTeamMapRow[] = mapRowsRaw.map((r) => ({
          matchId: r.match_id, finishedAt: r.finished_at, tier: r.tier as FaceitTeamMapRow["tier"],
          teamSide: r.team_side, mapName: r.map_name, mapType: r.map_type,
          won: r.winner_faction === r.team_side,
          attackedFirst: r.attacking_first == null ? null : r.attacking_first === `faction${r.team_side}`,
          heroBans: r.hero_bans ?? [],
        }));
        const totalMatches = matchRows.length;
        const roster: FaceitRosterPlayer[] = rosterRaw.map((r) => {
          const appearances = Number(r.appearances);
          const share = totalMatches === 0 ? 0 : appearances / totalMatches;
          return {
            faceitPlayerId: r.faceit_player_id, nickname: r.nickname, battletag: r.battletag,
            role: (r.role as FaceitRoleKey | null) ?? null,
            appearances, appearanceShare: share, starter: share >= STARTER_SHARE,
            fsr: r.fsr, tsr: r.tsr,
          };
        });
        return { matchRows, mapRows, roster };
      })
    );
  }

  // Top-N players by appearances for a single team id — the squad's "core".
  function fetchCorePlayers(teamId: string): Effect.Effect<string[], FaceitScoutingQueryError> {
    return Effect.tryPromise({
      try: () => prisma.$queryRaw<{ pid: string }[]>`
        SELECT r."faceitPlayerId" AS pid, COUNT(*) AS n
        FROM "FaceitMatchTeam" mt
        JOIN "FaceitMatchRoster" r ON r."matchId" = mt."matchId" AND r."teamSide" = mt."teamSide"
        WHERE mt."faceitTeamId" = ${teamId}
        GROUP BY r."faceitPlayerId" ORDER BY n DESC LIMIT ${CORE_SIZE}
      `,
      catch: (error) => new FaceitScoutingQueryError({ operation: "fetch core players", cause: error }),
    }).pipe(Effect.map((rows) => rows.map((r) => r.pid)));
  }

  function fetchRelatedTeams(teamId: string): Effect.Effect<RelatedTeam[], FaceitScoutingQueryError> {
    return Effect.tryPromise({
      try: () => prisma.$queryRaw<{ faceit_team_id: string; name: string; match_count: bigint; shared: bigint }[]>`
        WITH this_core AS (
          SELECT r."faceitPlayerId" pid, COUNT(*) n
          FROM "FaceitMatchTeam" mt
          JOIN "FaceitMatchRoster" r ON r."matchId" = mt."matchId" AND r."teamSide" = mt."teamSide"
          WHERE mt."faceitTeamId" = ${teamId}
          GROUP BY r."faceitPlayerId" ORDER BY n DESC LIMIT ${CORE_SIZE}
        ),
        other AS (
          SELECT mt."faceitTeamId" tid, COUNT(DISTINCT r."faceitPlayerId") shared
          FROM "FaceitMatchTeam" mt
          JOIN "FaceitMatchRoster" r ON r."matchId" = mt."matchId" AND r."teamSide" = mt."teamSide"
          WHERE r."faceitPlayerId" IN (SELECT pid FROM this_core)
            AND mt."faceitTeamId" <> ${teamId} AND mt."faceitTeamId" IS NOT NULL
          GROUP BY mt."faceitTeamId"
          HAVING COUNT(DISTINCT r."faceitPlayerId") >= ${RELATED_MIN_SHARED}
        ),
        named AS (
          SELECT o.tid, o.shared,
                 (SELECT mt2."teamName" FROM "FaceitMatchTeam" mt2 JOIN "FaceitMatch" m2 ON m2."faceitMatchId"=mt2."matchId" WHERE mt2."faceitTeamId"=o.tid ORDER BY m2."finishedAt" DESC LIMIT 1) name,
                 (SELECT COUNT(*) FROM "FaceitMatchTeam" mt3 WHERE mt3."faceitTeamId"=o.tid) match_count
          FROM other o
        )
        SELECT tid AS faceit_team_id, name, match_count::bigint, shared::bigint FROM named
      `,
      catch: (error) => new FaceitScoutingQueryError({ operation: "fetch related teams", cause: error }),
    }).pipe(
      Effect.map((rows) => rows.map((r) => ({
        faceitTeamId: r.faceit_team_id, name: r.name, matchCount: Number(r.match_count), sharedCorePlayers: Number(r.shared),
      })))
    );
  }

  // Caches (key by teamId; profile keyed by teamId+combined flag).
  const teamsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY, timeToLive: CACHE_TTL,
    lookup: (_k: string) => getFaceitTeams().pipe(Effect.tap(() => Metric.increment(faceitCacheMissTotal))),
  });
  const profileCache = yield* Cache.make({
    capacity: CACHE_CAPACITY, timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [id, c] = key.split("|");
      if (!id) return Effect.succeed(null);
      return getFaceitTeamProfile(id, { combined: c === "1" }).pipe(
        Effect.tap(() => Metric.increment(faceitCacheMissTotal))
      );
    },
  });

  return {
    getFaceitTeams: () =>
      teamsCache.get("__all__").pipe(Effect.tap(() => Metric.increment(faceitCacheRequestTotal))),
    getFaceitTeamProfile: (teamId, o) =>
      profileCache.get(`${teamId}|${o?.combined ? "1" : "0"}`).pipe(
        Effect.tap(() => Metric.increment(faceitCacheRequestTotal))
      ),
  } satisfies FaceitTeamScoutingServiceInterface;
});


export const FaceitTeamScoutingServiceLive = Layer.effect(FaceitTeamScoutingService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
