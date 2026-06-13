import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { Prisma, FaceitRole } from "@/generated/prisma/client";
import type { FaceitTier } from "@/generated/prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { FaceitScoutingQueryError } from "./errors";
import {
  faceitCacheMissTotal,
  faceitCacheRequestTotal,
  faceitPlayerProfileQueryDuration,
  faceitPlayerProfileQueryErrorTotal,
  faceitPlayerProfileQuerySuccessTotal,
  faceitPlayersQueryDuration,
  faceitPlayersQueryErrorTotal,
  faceitPlayersQuerySuccessTotal,
} from "./metrics";
import { mapWinrates } from "./aggregations";
import { roleUsage, statZToRadar, strengthsWeaknesses } from "./player-aggregations";
import type {
  FaceitPlayerListEntry,
  FaceitPlayerProfile,
  PlayerFsrRole,
  PlayerFsrTierCell,
  PlayerMatchHistoryEntry,
  PlayerRoleUsage,
  PlayerTeamEntry,
} from "./player-types";
import type { FaceitTeamMapRow, MapWinrateEntry } from "./types";

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

const DB_ROLE_TO_ENUM: Record<string, FaceitRole> = {
  Tank: FaceitRole.TANK,
  Damage: FaceitRole.DAMAGE,
  Support: FaceitRole.SUPPORT,
};

// ---- raw row shapes ---------------------------------------------------------

type PlayerListRow = {
  faceit_player_id: string;
  nickname: string;
  battletag: string | null;
  match_count: bigint;
  top_fsr: number | null;
};

type PlayerHeaderRow = {
  faceit_player_id: string;
  nickname: string;
  battletag: string | null;
  region: string;
  ow2_skill_level: number | null;
  verified: boolean;
};

type PlayerFsrRow = {
  role: string;
  fsr: number;
  map_count: number;
  recent_map_count_365d: number;
};

type PlayerFsrTierRow = {
  role: string;
  tier: string;
  fsr: number;
  map_count: number;
  minutes_played: number;
  stat_z: unknown;
};

type PercentileRow = {
  tier: string;
  role: string;
  percentile: number | null;
};

type PlayerMapRow = {
  team_side: number;
  finished_at: Date;
  tier: string;
  map_name: string | null;
  map_type: string | null;
  winner_faction: number | null;
  attacking_first: string | null;
};

type RoleUsageRow = {
  role: string;
  map_count: bigint;
};

type MatchHistoryRow = {
  match_id: string;
  finished_at: Date;
  tier: string;
  team_id: string | null;
  team_name: string;
  team_score: number;
  won: boolean;
  opponent_name: string | null;
  opp_score: number | null;
  role: string | null;
};

type PlayerTeamRow = {
  faceit_team_id: string;
  team_name: string;
  appearances: bigint;
};

// ---- service interface + tag ------------------------------------------------

export type FaceitPlayerScoutingServiceInterface = {
  readonly getFaceitPlayers: () => Effect.Effect<
    FaceitPlayerListEntry[],
    FaceitScoutingQueryError
  >;
  readonly getFaceitPlayerProfile: (
    playerId: string
  ) => Effect.Effect<FaceitPlayerProfile | null, FaceitScoutingQueryError>;
};

export class FaceitPlayerScoutingService extends Context.Tag(
  "@app/data/faceit/FaceitPlayerScoutingService"
)<FaceitPlayerScoutingService, FaceitPlayerScoutingServiceInterface>() {}

// ---- make -------------------------------------------------------------------

export const make: Effect.Effect<FaceitPlayerScoutingServiceInterface> =
  Effect.gen(function* () {
    // --- search list ---
    function getFaceitPlayers(): Effect.Effect<
      FaceitPlayerListEntry[],
      FaceitScoutingQueryError
    > {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {};
      return Effect.gen(function* () {
        const rows = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<PlayerListRow[]>`
              SELECT p."faceitPlayerId" AS faceit_player_id,
                     p."faceitNickname" AS nickname,
                     p.battletag,
                     (SELECT COUNT(*) FROM "FaceitMatchRoster" r
                      WHERE r."faceitPlayerId" = p."faceitPlayerId")::bigint AS match_count,
                     (SELECT MAX(pf.fsr) FROM "PlayerFsr" pf
                      WHERE pf."faceitPlayerId" = p."faceitPlayerId") AS top_fsr
              FROM "FaceitPlayer" p
              ORDER BY top_fsr DESC NULLS LAST, match_count DESC
            `,
          catch: (error) =>
            new FaceitScoutingQueryError({
              operation: "fetch faceit players",
              cause: error,
            }),
        }).pipe(Effect.withSpan("faceit.players.fetchRows"));

        const players: FaceitPlayerListEntry[] = rows.map((r) => ({
          faceitPlayerId: r.faceit_player_id,
          nickname: r.nickname,
          battletag: r.battletag,
          matchCount: Number(r.match_count),
          topFsr: r.top_fsr ?? null,
        }));
        wideEvent.player_count = players.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(faceitPlayersQuerySuccessTotal);
        return players;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
          }).pipe(Effect.andThen(Metric.increment(faceitPlayersQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("faceit.getFaceitPlayers")
                : Effect.logInfo("faceit.getFaceitPlayers");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(faceitPlayersQueryDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("faceit.getFaceitPlayers")
      );
    }

    // --- profile ---
    function getFaceitPlayerProfile(
      playerId: string
    ): Effect.Effect<FaceitPlayerProfile | null, FaceitScoutingQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { player_id: playerId };
      return Effect.gen(function* () {
        // Step 1: header
        const headerRows = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<PlayerHeaderRow[]>(
              Prisma.sql`
                SELECT p."faceitPlayerId" AS faceit_player_id,
                       p."faceitNickname" AS nickname,
                       p.battletag,
                       p.region::text AS region,
                       p."ow2SkillLevel" AS ow2_skill_level,
                       p.verified
                FROM "FaceitPlayer" p
                WHERE p."faceitPlayerId" = ${playerId}
              `
            ),
          catch: (error) =>
            new FaceitScoutingQueryError({
              operation: "fetch player header",
              cause: error,
            }),
        });

        if (headerRows.length === 0) {
          wideEvent.outcome = "not_found";
          return null;
        }
        const header = headerRows[0];
        if (!header) {
          wideEvent.outcome = "not_found";
          return null;
        }

        // Step 2: PlayerFsr + PlayerFsrTier rows
        const [fsrRows, fsrTierRows] = yield* Effect.tryPromise({
          try: async () => {
            const fsr = await prisma.$queryRaw<PlayerFsrRow[]>(
              Prisma.sql`
                SELECT pf.role::text AS role, pf.fsr, pf."mapCount" AS map_count,
                       pf."recentMapCount365d" AS recent_map_count_365d
                FROM "PlayerFsr" pf
                WHERE pf."faceitPlayerId" = ${playerId}
              `
            );
            const fsrTier = await prisma.$queryRaw<PlayerFsrTierRow[]>(
              Prisma.sql`
                SELECT pft.role::text AS role, pft.tier::text AS tier,
                       pft.fsr, pft."mapCount" AS map_count,
                       pft."minutesPlayed" AS minutes_played,
                       pft."statZ" AS stat_z
                FROM "PlayerFsrTier" pft
                WHERE pft."faceitPlayerId" = ${playerId}
              `
            );
            return [fsr, fsrTier] as const;
          },
          catch: (error) =>
            new FaceitScoutingQueryError({
              operation: "fetch player fsr",
              cause: error,
            }),
        });

        const rated = fsrRows.length > 0;

        // Step 3: percentiles per (tier, role)
        const percentileRows = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<PercentileRow[]>(
              Prisma.sql`
                SELECT pft.tier::text AS tier, pft.role::text AS role,
                       (100.0 *
                          (SELECT COUNT(*) FROM "PlayerFsrTier" x
                           WHERE x.tier = pft.tier AND x.role = pft.role AND x.fsr <= pft.fsr)
                        / NULLIF(
                            (SELECT COUNT(*) FROM "PlayerFsrTier" x
                             WHERE x.tier = pft.tier AND x.role = pft.role), 0)
                       ) AS percentile
                FROM "PlayerFsrTier" pft
                WHERE pft."faceitPlayerId" = ${playerId}
              `
            ),
          catch: (error) =>
            new FaceitScoutingQueryError({
              operation: "fetch player percentiles",
              cause: error,
            }),
        });

        // Build a lookup map for percentiles
        const percentileMap = new Map<string, number>();
        for (const pr of percentileRows) {
          percentileMap.set(`${pr.tier}:${pr.role}`, pr.percentile ?? 0);
        }

        // Step 4: player maps for mapWinrates
        const mapRows = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<PlayerMapRow[]>(
              Prisma.sql`
                SELECT s."teamSide" AS team_side,
                       m."finishedAt" AS finished_at,
                       c.tier::text AS tier,
                       mm."mapName" AS map_name,
                       mm."mapType"::text AS map_type,
                       mm."winnerFaction" AS winner_faction,
                       mm."attackingFirstFaction" AS attacking_first
                FROM "FaceitMapPlayerStats" s
                JOIN "FaceitMatchMap" mm ON mm.id = s."faceitMapId"
                JOIN "FaceitMatch" m ON m."faceitMatchId" = mm."matchId"
                JOIN "FaceitChampionship" c ON c."championshipId" = m."championshipId"
                WHERE s."faceitPlayerId" = ${playerId}
                  AND mm."winnerFaction" IS NOT NULL
              `
            ),
          catch: (error) =>
            new FaceitScoutingQueryError({
              operation: "fetch player maps",
              cause: error,
            }),
        });

        const teamMapRows: FaceitTeamMapRow[] = mapRows.map((r) => ({
          matchId: "",
          finishedAt: r.finished_at,
          tier: r.tier as FaceitTier,
          teamSide: r.team_side,
          mapName: r.map_name,
          mapType: r.map_type,
          won: r.winner_faction === r.team_side,
          attackedFirst:
            r.attacking_first == null
              ? null
              : r.attacking_first === `faction${r.team_side}`,
          heroBans: [],
        }));
        const mapWinratesResult: { byMap: MapWinrateEntry[]; byType: MapWinrateEntry[] } =
          mapWinrates(teamMapRows);

        // Step 5: role usage
        let roleUsageResult: PlayerRoleUsage[];
        if (rated) {
          roleUsageResult = roleUsage(
            fsrRows.map((r) => ({
              role: r.role as FaceitRole,
              mapCount: r.map_count,
            }))
          );
        } else {
          // Derive from FaceitMapPlayerStats when no PlayerFsr rows
          const rawRoleRows = yield* Effect.tryPromise({
            try: () =>
              prisma.$queryRaw<RoleUsageRow[]>(
                Prisma.sql`
                  SELECT s.role, COUNT(*)::bigint AS map_count
                  FROM "FaceitMapPlayerStats" s
                  WHERE s."faceitPlayerId" = ${playerId}
                    AND s.role IS NOT NULL
                  GROUP BY s.role
                `
              ),
            catch: (error) =>
              new FaceitScoutingQueryError({
                operation: "fetch player role usage (unrated)",
                cause: error,
              }),
          });
          roleUsageResult = roleUsage(
            rawRoleRows
              .map((r) => ({ role: DB_ROLE_TO_ENUM[r.role], mapCount: Number(r.map_count) }))
              .filter((r): r is { role: FaceitRole; mapCount: number } => r.role !== undefined)
          );
        }

        // Step 6: match history
        const historyRows = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<MatchHistoryRow[]>(
              Prisma.sql`
                SELECT mt."matchId" AS match_id,
                       m."finishedAt" AS finished_at,
                       c.tier::text AS tier,
                       mt."faceitTeamId" AS team_id,
                       mt."teamName" AS team_name,
                       mt.score AS team_score,
                       mt.winner AS won,
                       opp."teamName" AS opponent_name,
                       opp.score AS opp_score,
                       (SELECT s.role
                        FROM "FaceitMapPlayerStats" s
                        JOIN "FaceitMatchMap" mm2 ON mm2.id = s."faceitMapId"
                        WHERE mm2."matchId" = mt."matchId"
                          AND s."faceitPlayerId" = ${playerId}
                        GROUP BY s.role
                        ORDER BY COUNT(*) DESC
                        LIMIT 1) AS role
                FROM "FaceitMatchRoster" r
                JOIN "FaceitMatchTeam" mt
                  ON mt."matchId" = r."matchId" AND mt."teamSide" = r."teamSide"
                JOIN "FaceitMatch" m ON m."faceitMatchId" = r."matchId"
                JOIN "FaceitChampionship" c ON c."championshipId" = m."championshipId"
                LEFT JOIN "FaceitMatchTeam" opp
                  ON opp."matchId" = r."matchId" AND opp."teamSide" <> r."teamSide"
                WHERE r."faceitPlayerId" = ${playerId}
                ORDER BY m."finishedAt" DESC
              `
            ),
          catch: (error) =>
            new FaceitScoutingQueryError({
              operation: "fetch player match history",
              cause: error,
            }),
        });

        const matchHistory: PlayerMatchHistoryEntry[] = historyRows.map((r) => ({
          matchId: r.match_id,
          finishedAt: r.finished_at,
          tier: r.tier as FaceitTier,
          teamId: r.team_id,
          teamName: r.team_name,
          opponentName: r.opponent_name,
          score: `${r.team_score} - ${r.opp_score ?? 0}`,
          won: r.won,
          role: r.role,
        }));

        // Step 7: teams
        const teamRows = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<PlayerTeamRow[]>(
              Prisma.sql`
                SELECT mt."faceitTeamId" AS faceit_team_id,
                       (SELECT mt2."teamName"
                        FROM "FaceitMatchTeam" mt2
                        JOIN "FaceitMatch" m2 ON m2."faceitMatchId" = mt2."matchId"
                        WHERE mt2."faceitTeamId" = mt."faceitTeamId"
                        ORDER BY m2."finishedAt" DESC
                        LIMIT 1) AS team_name,
                       COUNT(*)::bigint AS appearances
                FROM "FaceitMatchRoster" r
                JOIN "FaceitMatchTeam" mt
                  ON mt."matchId" = r."matchId" AND mt."teamSide" = r."teamSide"
                WHERE r."faceitPlayerId" = ${playerId}
                  AND mt."faceitTeamId" IS NOT NULL
                GROUP BY mt."faceitTeamId"
                ORDER BY appearances DESC
              `
            ),
          catch: (error) =>
            new FaceitScoutingQueryError({
              operation: "fetch player teams",
              cause: error,
            }),
        });

        const teams: PlayerTeamEntry[] = teamRows
          .filter((r) => r.team_name != null)
          .map((r) => ({
            faceitTeamId: r.faceit_team_id,
            name: r.team_name,
            appearances: Number(r.appearances),
          }));

        // Step 8: assemble per-role FSR
        let fsrRoles: PlayerFsrRole[] = [];
        if (rated) {
          // Find the role with max total mapCount for primary flag
          const maxMapCount = Math.max(...fsrRows.map((r) => r.map_count));

          fsrRoles = fsrRows.map((fsrRow) => {
            const roleTiers = fsrTierRows.filter((t) => t.role === fsrRow.role);

            // Headline tier = cell with most mapCount
            let headlineTierRow: PlayerFsrTierRow | null = null;
            for (const t of roleTiers) {
              if (headlineTierRow === null || t.map_count > headlineTierRow.map_count) {
                headlineTierRow = t;
              }
            }

            const rawStatZ = headlineTierRow?.stat_z;
            const headlineStatZ =
              rawStatZ != null && typeof rawStatZ === "object"
                ? (rawStatZ as Record<string, number>)
                : {};

            const tiers: PlayerFsrTierCell[] = roleTiers.map((t) => ({
              tier: t.tier as FaceitTier,
              fsr: t.fsr,
              mapCount: t.map_count,
              minutesPlayed: t.minutes_played,
              percentile: percentileMap.get(`${t.tier}:${t.role}`) ?? 0,
            }));

            const radar = statZToRadar(headlineStatZ);
            const { strengths, weaknesses } = strengthsWeaknesses(headlineStatZ);

            return {
              role: fsrRow.role as FaceitRole,
              fsr: fsrRow.fsr,
              mapCount: fsrRow.map_count,
              recentMapCount365d: fsrRow.recent_map_count_365d,
              primary: fsrRow.map_count === maxMapCount,
              tiers,
              radar,
              strengths,
              weaknesses,
              headlineTier:
                headlineTierRow != null
                  ? (headlineTierRow.tier as FaceitTier)
                  : null,
            } satisfies PlayerFsrRole;
          });
        }

        wideEvent.rated = rated;
        wideEvent.fsr_role_count = fsrRoles.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(faceitPlayerProfileQuerySuccessTotal);

        return {
          player: {
            faceitPlayerId: header.faceit_player_id,
            nickname: header.nickname,
            battletag: header.battletag,
            region: header.region,
            ow2SkillLevel: header.ow2_skill_level,
            verified: header.verified,
          },
          rated,
          fsrRoles,
          roleUsage: roleUsageResult,
          mapWinrates: mapWinratesResult,
          matchHistory,
          teams,
        } satisfies FaceitPlayerProfile;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
          }).pipe(
            Effect.andThen(Metric.increment(faceitPlayerProfileQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("faceit.getFaceitPlayerProfile")
                : Effect.logInfo("faceit.getFaceitPlayerProfile");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                faceitPlayerProfileQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("faceit.getFaceitPlayerProfile")
      );
    }

    // --- caches ---
    const playersCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (_k: string) =>
        getFaceitPlayers().pipe(
          Effect.tap(() => Metric.increment(faceitCacheMissTotal))
        ),
    });

    const profileCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (playerId: string) =>
        getFaceitPlayerProfile(playerId).pipe(
          Effect.tap(() => Metric.increment(faceitCacheMissTotal))
        ),
    });

    return {
      getFaceitPlayers: () =>
        playersCache
          .get("__all__")
          .pipe(Effect.tap(() => Metric.increment(faceitCacheRequestTotal))),
      getFaceitPlayerProfile: (playerId: string) =>
        profileCache
          .get(playerId)
          .pipe(Effect.tap(() => Metric.increment(faceitCacheRequestTotal))),
    } satisfies FaceitPlayerScoutingServiceInterface;
  });

export const FaceitPlayerScoutingServiceLive = Layer.effect(
  FaceitPlayerScoutingService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
