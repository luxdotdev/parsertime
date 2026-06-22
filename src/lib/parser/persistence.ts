import "server-only";

import type { CreateScrimRequestData } from "@/app/api/scrim/create-scrim/route";
import { calculateStats } from "@/lib/calculate-stats";
import { Logger } from "@/lib/logger";
import { notifications } from "@/lib/notifications";
import {
  createDefensiveAssistsRows,
  createDvaRemechRows,
  createEchoDuplicateEndRows,
  createEchoDuplicateStartRows,
  createHeroSpawnRows,
  createHeroSwapRows,
  createKillRows,
  createMatchEndRows,
  createMatchStartRows,
  createMercyRezRows,
  createObjectiveCapturedRows,
  createObjectiveUpdatedRows,
  createOffensiveAssistRows,
  createPayloadProgressRows,
  createPlayerStatRows,
  createPointProgressRows,
  createRemechChargedRows,
  createRoundEndRows,
  createRoundStartRows,
  createSetupCompleteRows,
  createUltimateChargedRows,
  createUltimateEndRows,
  createUltimateStartRows,
  createAbility1UsedRows,
  createAbility2UsedRows,
  createDamageRows,
  createHealingRows,
} from "@/lib/parser/rows";
import prisma from "@/lib/prisma";
import { toTitleCase } from "@/lib/utils";
import type { ParserData } from "@/types/parser";
import type { UploadWinnerSource } from "@/lib/winner-source";
import type { Prisma, Role } from "@/generated/prisma/client";
import type { Session } from "next-auth";

export type InsertProgress = (completed: number, total: number) => void;

/**
 * Map ingestion writes thousands of damage/healing rows; the default 5s
 * interactive-transaction timeout would abort large uploads. Give the whole
 * insert room while still bounding it so a pathological upload rolls back
 * cleanly instead of pinning a pooled connection forever. Paired with a long
 * `maxDuration` on the upload routes so the function itself is not killed
 * mid-insert (which previously left a map with no damage/healing events).
 */
const MAP_INGEST_TX_OPTIONS = { maxWait: 15_000, timeout: 120_000 };

/**
 * Insert every event type's rows for a map, reporting progress weighted by how
 * many rows each event type contributes. Progress is measured in rows, so a
 * long kill feed moves the bar more than a one-line match_start. Passing no
 * `onProgress` runs the inserts exactly as before.
 */
async function insertMapEventRows(
  map: ParserData,
  scrim: { id: number },
  mapDataId: number,
  onProgress?: InsertProgress,
  db: Prisma.TransactionClient = prisma
): Promise<void> {
  const tasks: [keyof ParserData, () => Promise<unknown>][] = [
    ["ability_1_used", () => createAbility1UsedRows(map, scrim, mapDataId, db)],
    ["ability_2_used", () => createAbility2UsedRows(map, scrim, mapDataId, db)],
    ["damage", () => createDamageRows(map, scrim, mapDataId, db)],
    [
      "defensive_assist",
      () => createDefensiveAssistsRows(map, scrim, mapDataId, db),
    ],
    ["dva_remech", () => createDvaRemechRows(map, scrim, mapDataId, db)],
    [
      "echo_duplicate_end",
      () => createEchoDuplicateEndRows(map, scrim, mapDataId, db),
    ],
    [
      "echo_duplicate_start",
      () => createEchoDuplicateStartRows(map, scrim, mapDataId, db),
    ],
    ["healing", () => createHealingRows(map, scrim, mapDataId, db)],
    ["hero_spawn", () => createHeroSpawnRows(map, scrim, mapDataId, db)],
    ["hero_swap", () => createHeroSwapRows(map, scrim, mapDataId, db)],
    ["kill", () => createKillRows(map, scrim, mapDataId, db)],
    ["match_end", () => createMatchEndRows(map, scrim, mapDataId, db)],
    ["match_start", () => createMatchStartRows(map, scrim, mapDataId, db)],
    ["mercy_rez", () => createMercyRezRows(map, scrim, mapDataId, db)],
    [
      "objective_captured",
      () => createObjectiveCapturedRows(map, scrim, mapDataId, db),
    ],
    [
      "objective_updated",
      () => createObjectiveUpdatedRows(map, scrim, mapDataId, db),
    ],
    [
      "offensive_assist",
      () => createOffensiveAssistRows(map, scrim, mapDataId, db),
    ],
    [
      "payload_progress",
      () => createPayloadProgressRows(map, scrim, mapDataId, db),
    ],
    ["player_stat", () => createPlayerStatRows(map, scrim, mapDataId, db)],
    ["point_progress", () => createPointProgressRows(map, scrim, mapDataId, db)],
    ["remech_charged", () => createRemechChargedRows(map, scrim, mapDataId, db)],
    ["round_end", () => createRoundEndRows(map, scrim, mapDataId, db)],
    ["round_start", () => createRoundStartRows(map, scrim, mapDataId, db)],
    ["setup_complete", () => createSetupCompleteRows(map, scrim, mapDataId, db)],
    [
      "ultimate_charged",
      () => createUltimateChargedRows(map, scrim, mapDataId, db),
    ],
    ["ultimate_end", () => createUltimateEndRows(map, scrim, mapDataId, db)],
    ["ultimate_start", () => createUltimateStartRows(map, scrim, mapDataId, db)],
  ];

  const weights = tasks.map(([key]) => map[key]?.length ?? 0);
  const total = weights.reduce((sum, n) => sum + n, 0) || 1;

  let done = 0;
  onProgress?.(0, total);
  await Promise.all(
    tasks.map(async ([, run], i) => {
      await run();
      done += weights[i];
      onProgress?.(done, total);
    })
  );
}

export async function createNewScrimFromParsedData(
  data: CreateScrimRequestData,
  session: Session,
  onProgress?: InsertProgress
) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    operation: "createNewScrimFromParsedData",
    user_email: session.user?.email,
    scrim_name: data.name,
    team_id_raw: data.team,
    has_replay_code: !!data.replayCode,
    has_hero_bans: (data.heroBans?.length ?? 0) > 0,
    hero_ban_count: data.heroBans?.length ?? 0,
    timestamp: new Date().toISOString(),
  };

  try {
    const userId = await prisma.user.findFirst({
      where: {
        email: session.user?.email,
      },
    });

    if (!userId) {
      event.outcome = "user_not_found";
      throw new Error("User not found");
    }

    event.user_id = userId.id;

    // If the team is 0, it is an individual scrim
    // After changing the database host to Railway, we need to use null instead of 0
    const teamId = parseInt(data.team) === 0 ? null : parseInt(data.team);
    event.team_id = teamId;

    // Get all users in the team and get the team name. These reads — and the
    // notifications below — run outside the transaction so the transaction
    // holds a connection only for the duration of the inserts.
    const [users, team] = await Promise.all([
      prisma.user.findMany({
        select: { id: true },
        where: { teams: { some: { id: teamId ?? 0 } } },
      }),
      prisma.team.findFirst({
        where: { id: teamId ?? 0 },
        select: { name: true },
      }),
    ]);

    event.team_name = team?.name;
    event.team_member_count = users.length;

    const eventInsertStart = Date.now();

    // Create the scrim, its map, and every event row atomically. If anything
    // fails — including the function being killed mid-insert — Postgres rolls
    // the whole thing back, so a map can never persist without its events.
    const { scrimId, scrimName, mapDataId } = await prisma.$transaction(
      async (tx) => {
        const scrim = await tx.scrim.create({
          data: {
            name: data.name ?? "New Scrim",
            date: data.date ?? new Date(),
            createdAt: new Date(),
            creatorId: userId.id,
            teamId,
            opponentTeamAbbr: data.opponentTeamAbbr ?? null,
            autoAssignTeamNames: data.autoAssignTeamNames ?? false,
            team1Name: data.team1Name ?? null,
            team2Name: data.team2Name ?? null,
          },
        });

        event.scrim_id = scrim.id;

        const mapData = await tx.mapData.create({
          data: {
            scrimId: scrim.id,
            userId: userId.id,
          },
        });

        const map = await tx.map.create({
          data: {
            name: data.map.match_start[0][2] ?? "New Map",
            scrimId: scrim.id,
            replayCode: data.replayCode ?? "",
            order: 0,
            winner: data.winner ?? null,
            winnerSource: data.winnerSource ?? null,
            mapData: {
              connect: {
                id: mapData.id,
              },
            },
          },
        });

        event.map_id = map.id;
        event.map_data_id = mapData.id;
        event.map_name = map.name;

        if (data.heroBans) {
          await tx.heroBan.createMany({
            data: data.heroBans.map((ban) => ({
              scrimId: scrim.id,
              hero: ban.hero,
              team:
                ban.team === "team1"
                  ? data.map.match_start[0][4]
                  : data.map.match_start[0][5],
              banPosition: ban.banPosition,
              MapDataId: mapData.id,
            })),
          });
        }

        await tx.scrim.update({
          where: {
            id: scrim.id,
          },
          data: {
            maps: {
              connect: {
                id: map.id,
              },
            },
          },
        });

        try {
          await insertMapEventRows(data.map, scrim, mapData.id, onProgress, tx);
        } catch (error) {
          event.outcome = "event_insert_failed";
          event.error = {
            message: error instanceof Error ? error.message : String(error),
            type: error instanceof Error ? error.name : "UnknownError",
          };
          event.rolled_back = true;
          throw new Error("Invalid Log Format");
        }

        return {
          scrimId: scrim.id,
          scrimName: scrim.name,
          mapDataId: mapData.id,
        };
      },
      MAP_INGEST_TX_OPTIONS
    );

    event.event_insert_duration_ms = Date.now() - eventInsertStart;

    // Side effects that must only run once the upload is durably committed.
    if (teamId !== 0 && teamId !== null) {
      for (const user of users) {
        await notifications.createInAppNotification({
          userId: user.id,
          title: `${team?.name}: New scrim uploaded by ${session.user?.name}`,
          description: `Scrim "${scrimName}" has been uploaded by ${session.user?.name} to ${team?.name}.`,
          href: `/${teamId}/scrim/${scrimId}`,
        });
      }
    }

    await calculateStatsForMap(mapDataId, scrimId);

    event.outcome = "success";
    return scrimId;
  } catch (error) {
    if (!event.outcome) {
      event.outcome = "error";
      event.error = {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : "UnknownError",
      };
    }
    throw error;
  } finally {
    event.duration_ms = Date.now() - startTime;
    Logger.info(event);
  }
}

type CreateNewMapArgs = {
  scrimId: number;
  map: ParserData;
  order?: number;
  heroBans?: {
    hero: string;
    team: string;
    banPosition: number;
  }[];
  winner?: string | null;
  winnerSource?: UploadWinnerSource | null;
};

export async function createNewMap(
  data: CreateNewMapArgs,
  session: Session,
  onProgress?: InsertProgress
) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    operation: "createNewMap",
    user_email: session.user.email,
    scrim_id: data.scrimId,
    has_hero_bans: (data.heroBans?.length ?? 0) > 0,
    hero_ban_count: data.heroBans?.length ?? 0,
    timestamp: new Date().toISOString(),
  };

  try {
    const userId = await prisma.user.findFirst({
      where: {
        email: session.user.email,
      },
    });

    if (!userId) {
      event.outcome = "user_not_found";
      throw new Error("User not found");
    }

    event.user_id = userId.id;

    const eventInsertStart = Date.now();

    // Create the map and every event row atomically. If anything fails — or the
    // function is killed mid-insert — Postgres rolls the whole thing back, so a
    // map can never persist without its damage/healing events.
    const { mapId, mapDataId } = await prisma.$transaction(async (tx) => {
      const mapData = await tx.mapData.create({
        data: {
          scrimId: data.scrimId,
          userId: userId.id,
        },
      });

      const map = await tx.map.create({
        data: {
          name: toTitleCase(data.map.match_start[0][2]) ?? "New Map",
          scrimId: data.scrimId,
          order: data.order ?? 0,
          winner: data.winner ?? null,
          winnerSource: data.winnerSource ?? null,
          mapData: {
            connect: {
              id: mapData.id,
            },
          },
        },
      });

      event.map_id = map.id;
      event.map_data_id = mapData.id;
      event.map_name = map.name;

      if (data.heroBans && data.heroBans.length > 0) {
        await tx.heroBan.createMany({
          data: data.heroBans.map((ban) => ({
            scrimId: data.scrimId,
            hero: ban.hero,
            team:
              ban.team === "team1"
                ? data.map.match_start[0][4]
                : data.map.match_start[0][5],
            banPosition: ban.banPosition,
            MapDataId: mapData.id,
          })),
        });
      }

      await tx.scrim.update({
        where: {
          id: data.scrimId,
        },
        data: {
          maps: {
            connect: {
              id: map.id,
            },
          },
        },
      });

      await tx.note.create({
        data: {
          content: "<p>Add your notes here...</p>",
          scrimId: data.scrimId,
          MapDataId: mapData.id,
        },
      });

      try {
        await insertMapEventRows(
          data.map,
          { id: data.scrimId },
          mapData.id,
          onProgress,
          tx
        );
      } catch (error) {
        event.outcome = "event_insert_failed";
        event.error = {
          message: error instanceof Error ? error.message : String(error),
          type: error instanceof Error ? error.name : "UnknownError",
        };
        event.rolled_back = true;
        throw new Error("Invalid Log Format");
      }

      return { mapId: map.id, mapDataId: mapData.id };
    }, MAP_INGEST_TX_OPTIONS);

    event.event_insert_duration_ms = Date.now() - eventInsertStart;

    await calculateStatsForMap(mapDataId, data.scrimId);

    event.outcome = "success";
    return { mapId, mapDataId };
  } catch (error) {
    if (!event.outcome) {
      event.outcome = "error";
      event.error = {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : "UnknownError",
      };
    }
    throw error;
  } finally {
    event.duration_ms = Date.now() - startTime;
    Logger.info(event);
  }
}

export async function calculateStatsForMap(mapDataId: number, scrimId: number) {
  Logger.log("Calculating stats for map: ", mapDataId, "scrim: ", scrimId);
  const players = await prisma.playerStat.findMany({
    where: {
      MapDataId: mapDataId,
    },
    select: {
      player_name: true,
    },
    distinct: ["player_name"],
  });

  Logger.log(
    "Found ",
    players.length,
    " players for map: ",
    mapDataId,
    "scrim: ",
    scrimId
  );

  for (const player of players) {
    try {
      Logger.log(
        "Calculating stats for player: ",
        player.player_name,
        "on map: ",
        mapDataId,
        "scrim: ",
        scrimId
      );

      const stats = await calculateStats(mapDataId, player.player_name);

      const calculatedStatRecords = [];

      if (
        stats.fletaDeadliftPercentage !== null &&
        !isNaN(stats.fletaDeadliftPercentage)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "FLETA_DEADLIFT_PERCENTAGE" as const,
          value: stats.fletaDeadliftPercentage,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.firstPickPercentage !== null &&
        !isNaN(stats.firstPickPercentage)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "FIRST_PICK_PERCENTAGE" as const,
          value: stats.firstPickPercentage,
          MapDataId: mapDataId,
        });
      }

      if (stats.firstPickCount !== null && !isNaN(stats.firstPickCount)) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "FIRST_PICK_COUNT" as const,
          value: stats.firstPickCount,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.firstDeathPercentage !== null &&
        !isNaN(stats.firstDeathPercentage)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "FIRST_DEATH_PERCENTAGE" as const,
          value: stats.firstDeathPercentage,
          MapDataId: mapDataId,
        });
      }

      if (stats.firstDeathCount !== null && !isNaN(stats.firstDeathCount)) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "FIRST_DEATH_COUNT" as const,
          value: stats.firstDeathCount,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.mvpScore !== null &&
        stats.mvpScore !== undefined &&
        !isNaN(stats.mvpScore)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "MVP_SCORE" as const,
          value: stats.mvpScore,
          MapDataId: mapDataId,
        });
      }

      if (stats.isMapMVP) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "MAP_MVP_COUNT" as const,
          value: 1,
          MapDataId: mapDataId,
        });
      }

      if (stats.ajaxCount !== null && !isNaN(stats.ajaxCount)) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "AJAX_COUNT" as const,
          value: stats.ajaxCount,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.averageUltChargeTime !== null &&
        !isNaN(stats.averageUltChargeTime)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "AVERAGE_ULT_CHARGE_TIME" as const,
          value: stats.averageUltChargeTime,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.averageTimeToUseUlt !== null &&
        !isNaN(stats.averageTimeToUseUlt)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "AVERAGE_TIME_TO_USE_ULT" as const,
          value: stats.averageTimeToUseUlt,
          MapDataId: mapDataId,
        });
      }

      if (stats.droughtTime !== null && !isNaN(stats.droughtTime)) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "AVERAGE_DROUGHT_TIME" as const,
          value: stats.droughtTime,
          MapDataId: mapDataId,
        });
      }

      if (stats.killsPerUltimate !== null && !isNaN(stats.killsPerUltimate)) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "KILLS_PER_ULTIMATE" as const,
          value: stats.killsPerUltimate,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.duels &&
        typeof stats.duels === "object" &&
        "winrate" in stats.duels
      ) {
        const duelWinrate = (stats.duels as { winrate: number }).winrate;
        if (duelWinrate !== null && !isNaN(duelWinrate)) {
          calculatedStatRecords.push({
            scrimId,
            playerName: stats.playerName,
            hero: stats.hero,
            role: stats.role as Role,
            stat: "DUEL_WINRATE_PERCENTAGE" as const,
            value: duelWinrate,
            MapDataId: mapDataId,
          });
        }
      }

      if (
        stats.fightReversalPercentage !== null &&
        !isNaN(stats.fightReversalPercentage)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "FIGHT_REVERSAL_PERCENTAGE" as const,
          value: stats.fightReversalPercentage,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.averageEngagementDistance !== null &&
        !isNaN(stats.averageEngagementDistance)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "AVERAGE_ENGAGEMENT_DISTANCE" as const,
          value: stats.averageEngagementDistance,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.highGroundKillPercentage !== null &&
        !isNaN(stats.highGroundKillPercentage)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "HIGH_GROUND_KILL_PERCENTAGE" as const,
          value: stats.highGroundKillPercentage,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.isolationDeathPercentage !== null &&
        !isNaN(stats.isolationDeathPercentage)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "ISOLATION_DEATH_PERCENTAGE" as const,
          value: stats.isolationDeathPercentage,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.averageFightStartSpread !== null &&
        !isNaN(stats.averageFightStartSpread)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "AVERAGE_FIGHT_START_SPREAD" as const,
          value: stats.averageFightStartSpread,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.averageUltConversionKills !== null &&
        !isNaN(stats.averageUltConversionKills)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "AVERAGE_ULT_CONVERSION_KILLS" as const,
          value: stats.averageUltConversionKills,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.ultDeathPercentage !== null &&
        !isNaN(stats.ultDeathPercentage)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "ULT_DEATH_PERCENTAGE" as const,
          value: stats.ultDeathPercentage,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.averageUltDisplacement !== null &&
        !isNaN(stats.averageUltDisplacement)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "AVERAGE_ULT_DISPLACEMENT" as const,
          value: stats.averageUltDisplacement,
          MapDataId: mapDataId,
        });
      }

      if (
        stats.ultsOnObjectivePercentage !== null &&
        !isNaN(stats.ultsOnObjectivePercentage)
      ) {
        calculatedStatRecords.push({
          scrimId,
          playerName: stats.playerName,
          hero: stats.hero,
          role: stats.role as Role,
          stat: "ULTS_ON_OBJECTIVE_PERCENTAGE" as const,
          value: stats.ultsOnObjectivePercentage,
          MapDataId: mapDataId,
        });
      }

      if (calculatedStatRecords.length > 0) {
        await prisma.calculatedStat.createMany({
          data: calculatedStatRecords,
          skipDuplicates: true,
        });

        Logger.info(
          "Stats saved for player: ",
          player.player_name,
          "on map: ",
          mapDataId,
          "scrim: ",
          scrimId,
          "calculated stats: ",
          calculatedStatRecords.length
        );
      }
    } catch (error) {
      Logger.error(
        `Error calculating stats for player ${player.player_name} on map ${mapDataId}:`,
        error
      );
    }
  }
}
