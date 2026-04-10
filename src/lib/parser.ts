import "server-only";

import type { CreateScrimRequestData } from "@/app/api/scrim/create-scrim/route";
import { calculateStats } from "@/lib/calculate-stats";
import { headers } from "@/lib/headers";
import { Logger } from "@/lib/logger";
import { notifications } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { toTitleCase } from "@/lib/utils";
import type { ParserData } from "@/types/parser";
import { type $Enums, MapType, type Role } from "@prisma/client";
import type { Session } from "next-auth";
import * as XLSX from "xlsx";

const XLSX_FILE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const TXT_FILE = "text/plain";

const TEAM_NAME_FIELDS: Record<string, number[]> = {
  ability_1_used: [2],
  ability_2_used: [2],
  damage: [2, 5],
  defensive_assist: [2],
  dva_remech: [2],
  echo_duplicate_end: [2],
  echo_duplicate_start: [2],
  healing: [2, 5],
  hero_spawn: [2],
  hero_swap: [2],
  kill: [2, 5],
  match_start: [4, 5],
  objective_captured: [3],
  offensive_assist: [2],
  payload_progress: [3],
  player_stat: [3],
  point_progress: [3],
  remech_charged: [2],
  ultimate_charged: [2],
  ultimate_end: [2],
  ultimate_start: [2],
  round_end: [3],
  round_start: [3],
};

const TEAM_POSITIONAL_SWAP_FIELDS: Record<string, [number, number][]> = {
  match_start: [[4, 5]],
  match_end: [[3, 4]],
  objective_captured: [[5, 6]],
  round_end: [
    [4, 5],
    [7, 8],
  ],
  round_start: [[4, 5]],
};

export function normalizeTeamData(
  data: ParserData,
  newTeam1Name: string,
  newTeam2Name: string | null,
  userIsOriginalTeam2: boolean
): ParserData {
  const origTeam1 = String(data.match_start[0][4]);
  const origTeam2 = String(data.match_start[0][5]);

  const result = structuredClone(data);

  if (userIsOriginalTeam2) {
    for (const [eventType, swapPairs] of Object.entries(
      TEAM_POSITIONAL_SWAP_FIELDS
    )) {
      const events = result[eventType as keyof ParserData] as
        | unknown[][]
        | undefined;
      if (!events) continue;
      for (const row of events) {
        for (const [i, j] of swapPairs) {
          [row[i], row[j]] = [row[j], row[i]];
        }
      }
    }
  }

  const nameToReplace1 = userIsOriginalTeam2 ? origTeam2 : origTeam1;
  const nameToReplace2 = userIsOriginalTeam2 ? origTeam1 : origTeam2;

  for (const [eventType, indices] of Object.entries(TEAM_NAME_FIELDS)) {
    const events = result[eventType as keyof ParserData] as
      | unknown[][]
      | undefined;
    if (!events) continue;
    for (const row of events) {
      for (const idx of indices) {
        const val = String(row[idx]);
        if (val === nameToReplace1) {
          row[idx] = newTeam1Name;
        } else if (newTeam2Name !== null && val === nameToReplace2) {
          row[idx] = newTeam2Name;
        }
      }
    }
  }

  return result;
}

/**
 * Parses a file and returns a JSON object with the data
 *
 * @param file - The file to parse
 * @returns {Promise<ParserData>} The parsed data
 */
export async function parseData(file: File) {
  switch (file.type) {
    case XLSX_FILE:
      return await parseDataFromXLSX(file);
    case TXT_FILE:
      return await parseDataFromTXT(file);
    default:
      throw new Error("Invalid file type");
  }
}

/**
 * Cleans invalid lines from the parsed data
 * - Removes mercy_rez lines that contain null values (empty fields)
 * - Replaces asterisk values with "0"
 */
function cleanInvalidLines(lines: string[][]): string[][] {
  return lines
    .filter((line) => {
      // Remove invalid mercy_rez lines that contain empty values
      if (line[0] === "mercy_rez") {
        // Check if any field (except the first one which is event type) is empty
        return !line.slice(1).some((field) => field === "" || field == null);
      }
      return true;
    })
    .map((line) => {
      // Replace asterisk values with "0"
      return line.map((field) => {
        if (field.includes("*")) {
          return "0";
        }
        return field;
      });
    });
}

/**
 * Splits a line on commas, but preserves commas inside parenthesized
 * coordinate tuples like `(59.73, 267.58, 340.44)`.
 */
export function splitLinePreservingCoords(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of line) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parses a coordinate string like `(59.73, 267.58, 340.44)` into x, y, z.
 * Returns null if the value is not a valid coordinate string.
 */
export function parseCoordinate(
  value: unknown
): { x: number; y: number; z: number } | null {
  if (!value || typeof value !== "string") return null;
  const match = value.trim().match(/^\(([^,]+),\s*([^,]+),\s*([^)]+)\)$/);
  if (!match) return null;
  const x = parseFloat(match[1]);
  const y = parseFloat(match[2]);
  const z = parseFloat(match[3]);
  if (isNaN(x) || isNaN(y) || isNaN(z)) return null;
  return { x, y, z };
}

export async function parseDataFromTXT(file: File) {
  const fileContent =
    process.env.NODE_ENV !== "test"
      ? await file?.text()
      : (file as unknown as string); // cast to string because we're in test mode

  const lines = fileContent
    .split("\n")
    .map((line) => splitLinePreservingCoords(line));

  // remove first element of each array
  lines.forEach((line) => line.shift());

  // Clean invalid lines
  const cleanedLines = cleanInvalidLines(lines);

  // Indexes for event types with string fields that should skip numeric parsing
  // Includes name/hero fields that can be "0" (e.g. health pack healing has no healer)
  const stringFieldIndexes: Record<string, number[]> = {
    kill: [3, 4, 6, 7, 8, 10, 11],
    damage: [3, 4, 6, 7, 8, 10, 11],
    healing: [3, 4, 6, 7, 8, 10],
  };

  // Function to check and convert a value to a number if applicable or replace empty strings with null
  function convertToNumberOrReplaceEmpty(
    value: string,
    eventType: string,
    index: number
  ) {
    if (value === "") {
      return null; // Replace empty strings with null
    }
    if (
      (eventType === "round_end" || eventType === "round_start") &&
      index === 3
    ) {
      if (MapType.Control && value === "0") {
        return 0; // return as number (0) for Control maps
      }
      return value; // return as string for other maps
    }
    if (isTeamNameField(eventType, index)) {
      return value;
    }
    if (stringFieldIndexes[eventType]?.includes(index)) {
      return value; // Skip conversion for string fields
    }
    const parsedValue = parseFloat(value);
    return isNaN(parsedValue) ? value : parsedValue;
  }

  function isTeamNameField(eventType: string, index: number): boolean {
    return TEAM_NAME_FIELDS[eventType]?.includes(index) || false;
  }

  const categorizedData: Record<string, string[][]> = {};
  cleanedLines.forEach((line) => {
    const eventType = line[0];
    if (headers[eventType]) {
      if (!categorizedData[eventType]) {
        categorizedData[eventType] = [headers[eventType]]; // Prepend headers
      }
      // Convert values to numbers where applicable and replace empty strings with null
      const convertedLine = line.map((value, index) =>
        convertToNumberOrReplaceEmpty(value, eventType, index)
      );
      categorizedData[eventType].push(convertedLine as never);
    }
  });

  // If the attacker team is "All Teams", it means that:
  // - An Echo player died during ult
  // - possibly more? (need to check)
  //
  // In this case, we need to replace the attacker team, name, and hero with the victim's team, name, and hero.
  // This is because we want to show this as a standard Environmental kill.
  for (const kill of categorizedData["kill"]) {
    if (kill[2] === "All Teams") {
      kill[2] = kill[5]; // Set attacker team to victim team
      kill[3] = kill[6]; // Set attacker name to victim name
      kill[4] = kill[7]; // Set attacker hero to victim hero
    }
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Get event types sorted alphabetically
  const sortedEventTypes = Object.keys(categorizedData).sort();

  // Create a sheet for each sorted event type and add data
  sortedEventTypes.forEach((eventType) => {
    const ws = XLSX.utils.aoa_to_sheet(categorizedData[eventType]);
    XLSX.utils.book_append_sheet(workbook, ws, eventType);
  });

  const sheetName = workbook.SheetNames as $Enums.EventType[];

  // oxlint-disable-next-line @typescript-eslint/consistent-type-assertions
  const result = {} as ParserData;

  // for each sheet, convert to json and add it to the result object.
  for (const sheet of sheetName) {
    const ws = workbook.Sheets[sheet];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);

    // Dynamic assignment of varying types based on sheet names.
    // TypeScript cannot infer the correct type for `json` as it depends on the runtime sheet name.
    // We ensure at runtime that `json` conforms to the expected structure of `ParserData`.
    result[sheet] = json as never;
  }

  return result;
}

export async function parseDataFromXLSX(file: File) {
  const reader = new FileReader();

  const data = await new Promise((resolve, reject) => {
    reader.onload = (e: ProgressEvent<FileReader>) => resolve(e.target?.result);
    reader.onerror = () => reject(new Error("Failed to read the file."));
    reader.readAsBinaryString(file);
  });

  const workbook = XLSX.read(data, { type: "binary" });
  const sheetName = workbook.SheetNames as $Enums.EventType[];

  // oxlint-disable-next-line @typescript-eslint/consistent-type-assertions
  const result = {} as ParserData;

  // for each sheet, convert to json and add it to the result object.
  for (const sheet of sheetName) {
    const ws = workbook.Sheets[sheet];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);

    // @ts-expect-error - Dynamic assignment of varying types based on sheet names.
    // TypeScript cannot infer the correct type for `json` as it depends on the runtime sheet name.
    // We ensure at runtime that `json` conforms to the expected structure of `ParserData`.
    result[sheet] = json;
  }

  return result;
}

export async function createNewScrimFromParsedData(
  data: CreateScrimRequestData,
  session: Session
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

    const scrim = await prisma.scrim.create({
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

    // Get all users in the team and get the team name
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

    // Create a notification for each user UNLESS individual scrim
    if (teamId !== 0 && teamId !== null) {
      for (const user of users) {
        await notifications.createInAppNotification({
          userId: user.id,
          title: `${team?.name}: New scrim uploaded by ${session.user?.name}`,
          description: `Scrim "${scrim.name}" has been uploaded by ${session.user?.name} to ${team?.name}.`,
          href: `/${teamId}/scrim/${scrim.id}`,
        });
      }
    }

    const mapData = await prisma.mapData.create({
      data: {
        scrimId: scrim.id,
        userId: userId.id,
      },
    });

    const map = await prisma.map.create({
      data: {
        name: data.map.match_start[0][2] ?? "New Map",
        scrimId: scrim.id,
        replayCode: data.replayCode ?? "",
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
      await prisma.heroBan.createMany({
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

    await prisma.scrim.update({
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

    const firstMap = data.map;
    const eventInsertStart = Date.now();

    try {
      await Promise.all([
        createAbility1UsedRows(firstMap, scrim, mapData.id),
        createAbility2UsedRows(firstMap, scrim, mapData.id),
        createDamageRows(firstMap, scrim, mapData.id),
        createDefensiveAssistsRows(firstMap, scrim, mapData.id),
        createDvaRemechRows(firstMap, scrim, mapData.id),
        createEchoDuplicateEndRows(firstMap, scrim, mapData.id),
        createEchoDuplicateStartRows(firstMap, scrim, mapData.id),
        createHealingRows(firstMap, scrim, mapData.id),
        createHeroSpawnRows(firstMap, scrim, mapData.id),
        createHeroSwapRows(firstMap, scrim, mapData.id),
        createKillRows(firstMap, scrim, mapData.id),
        createMatchEndRows(firstMap, scrim, mapData.id),
        createMatchStartRows(firstMap, scrim, mapData.id),
        createMercyRezRows(firstMap, scrim, mapData.id),
        createObjectiveCapturedRows(firstMap, scrim, mapData.id),
        createObjectiveUpdatedRows(firstMap, scrim, mapData.id),
        createOffensiveAssistRows(firstMap, scrim, mapData.id),
        createPayloadProgressRows(firstMap, scrim, mapData.id),
        createPlayerStatRows(firstMap, scrim, mapData.id),
        createPointProgressRows(firstMap, scrim, mapData.id),
        createRemechChargedRows(firstMap, scrim, mapData.id),
        createRoundEndRows(firstMap, scrim, mapData.id),
        createRoundStartRows(firstMap, scrim, mapData.id),
        createSetupCompleteRows(firstMap, scrim, mapData.id),
        createUltimateChargedRows(firstMap, scrim, mapData.id),
        createUltimateEndRows(firstMap, scrim, mapData.id),
        createUltimateStartRows(firstMap, scrim, mapData.id),
      ]);

      event.event_insert_duration_ms = Date.now() - eventInsertStart;

      await calculateStatsForMap(mapData.id, scrim.id);
    } catch (error) {
      event.event_insert_duration_ms = Date.now() - eventInsertStart;
      event.outcome = "event_insert_failed";
      event.error = {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : "UnknownError",
      };

      // delete the scrim and map if an error occurs
      await prisma.scrim.delete({
        where: {
          id: scrim.id,
        },
      });

      await prisma.map.delete({
        where: {
          id: map.id,
        },
      });

      event.rolled_back = true;

      throw new Error("Invalid Log Format");
    }

    event.outcome = "success";
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
  heroBans?: {
    hero: string;
    team: string;
    banPosition: number;
  }[];
};

export async function createNewMap(data: CreateNewMapArgs, session: Session) {
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

    const mapData = await prisma.mapData.create({
      data: {
        scrimId: data.scrimId,
        userId: userId.id,
      },
    });

    const map = await prisma.map.create({
      data: {
        name: toTitleCase(data.map.match_start[0][2]) ?? "New Map",
        scrimId: data.scrimId,
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
      await prisma.heroBan.createMany({
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

    await prisma.scrim.update({
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

    await prisma.note.create({
      data: {
        content: "<p>Add your notes here...</p>",
        scrimId: data.scrimId,
        MapDataId: mapData.id,
      },
    });

    const eventInsertStart = Date.now();

    try {
      await Promise.all([
        createAbility1UsedRows(data.map, { id: data.scrimId }, mapData.id),
        createAbility2UsedRows(data.map, { id: data.scrimId }, mapData.id),
        createDamageRows(data.map, { id: data.scrimId }, mapData.id),
        createDefensiveAssistsRows(data.map, { id: data.scrimId }, mapData.id),
        createDvaRemechRows(data.map, { id: data.scrimId }, mapData.id),
        createEchoDuplicateEndRows(data.map, { id: data.scrimId }, mapData.id),
        createEchoDuplicateStartRows(
          data.map,
          { id: data.scrimId },
          mapData.id
        ),
        createHealingRows(data.map, { id: data.scrimId }, mapData.id),
        createHeroSpawnRows(data.map, { id: data.scrimId }, mapData.id),
        createHeroSwapRows(data.map, { id: data.scrimId }, mapData.id),
        createKillRows(data.map, { id: data.scrimId }, mapData.id),
        createMatchEndRows(data.map, { id: data.scrimId }, mapData.id),
        createMatchStartRows(data.map, { id: data.scrimId }, mapData.id),
        createMercyRezRows(data.map, { id: data.scrimId }, mapData.id),
        createObjectiveCapturedRows(data.map, { id: data.scrimId }, mapData.id),
        createObjectiveUpdatedRows(data.map, { id: data.scrimId }, mapData.id),
        createOffensiveAssistRows(data.map, { id: data.scrimId }, mapData.id),
        createPayloadProgressRows(data.map, { id: data.scrimId }, mapData.id),
        createPlayerStatRows(data.map, { id: data.scrimId }, mapData.id),
        createPointProgressRows(data.map, { id: data.scrimId }, mapData.id),
        createRemechChargedRows(data.map, { id: data.scrimId }, mapData.id),
        createRoundEndRows(data.map, { id: data.scrimId }, mapData.id),
        createRoundStartRows(data.map, { id: data.scrimId }, mapData.id),
        createSetupCompleteRows(data.map, { id: data.scrimId }, mapData.id),
        createUltimateChargedRows(data.map, { id: data.scrimId }, mapData.id),
        createUltimateEndRows(data.map, { id: data.scrimId }, mapData.id),
        createUltimateStartRows(data.map, { id: data.scrimId }, mapData.id),
      ]);
    } catch (error) {
      event.event_insert_duration_ms = Date.now() - eventInsertStart;
      event.outcome = "event_insert_failed";
      event.error = {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : "UnknownError",
      };

      await prisma.map.delete({
        where: {
          id: map.id,
        },
      });

      event.rolled_back = true;

      throw new Error("Invalid Log Format");
    }

    event.event_insert_duration_ms = Date.now() - eventInsertStart;

    await calculateStatsForMap(mapData.id, data.scrimId);

    event.outcome = "success";
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

export async function createDefensiveAssistsRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.defensive_assist === "undefined" ||
    data.defensive_assist.length === 0 ||
    !data.defensive_assist
  ) {
    Logger.log(
      "No defensive assists found for map: ",
      mapId,
      "scrim: ",
      scrim.id
    );
    return [];
  }

  await prisma.defensiveAssist.createMany({
    data: data.defensive_assist.map((assist) => ({
      scrimId: scrim.id,
      match_time: assist[1],
      player_team: String(assist[2]),
      player_name: assist[3],
      player_hero: assist[4],
      hero_duplicated: String(assist[5]),
      MapDataId: mapId,
    })),
  });

  const defensiveAssistsByScrimId = await prisma.defensiveAssist.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return defensiveAssistsByScrimId;
}

export async function createDvaRemechRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.dva_remech === "undefined" ||
    data.dva_remech.length === 0 ||
    !data.dva_remech
  ) {
    Logger.log("No D.Va remechs found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.dvaRemech.createMany({
    data: data.dva_remech.map((remech) => ({
      scrimId: scrim.id,
      match_time: remech[1],
      player_team: String(remech[2]),
      player_name: remech[3],
      player_hero: remech[4],
      ultimate_id: remech[5],
      MapDataId: mapId,
    })),
  });

  const dvaRemechsByScrimId = await prisma.dvaRemech.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return dvaRemechsByScrimId;
}

export async function createEchoDuplicateEndRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.echo_duplicate_end === "undefined" ||
    data.echo_duplicate_end.length === 0 ||
    !data.echo_duplicate_end
  ) {
    Logger.log(
      "No echo duplicate ends found for map: ",
      mapId,
      "scrim: ",
      scrim.id
    );
    return [];
  }

  await prisma.echoDuplicateEnd.createMany({
    data: data.echo_duplicate_end.map((duplicateEnd) => ({
      scrimId: scrim.id,
      match_time: duplicateEnd[1],
      player_team: String(duplicateEnd[2]),
      player_name: duplicateEnd[3],
      player_hero: duplicateEnd[4],
      ultimate_id: duplicateEnd[5],
      MapDataId: mapId,
    })),
  });

  const echoDuplicateEndsByScrimId = await prisma.echoDuplicateEnd.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return echoDuplicateEndsByScrimId;
}

export async function createEchoDuplicateStartRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.echo_duplicate_start === "undefined" ||
    data.echo_duplicate_start.length === 0 ||
    !data.echo_duplicate_start
  ) {
    Logger.log(
      "No echo duplicate starts found for map: ",
      mapId,
      "scrim: ",
      scrim.id
    );
    return [];
  }

  await prisma.echoDuplicateStart.createMany({
    data: data.echo_duplicate_start.map((duplicateStart) => ({
      scrimId: scrim.id,
      match_time: duplicateStart[1],
      player_team: String(duplicateStart[2]),
      player_name: duplicateStart[3],
      player_hero: duplicateStart[4],
      hero_duplicated: duplicateStart[5],
      ultimate_id: duplicateStart[6],
      MapDataId: mapId,
    })),
  });

  const echoDuplicateStartsByScrimId = await prisma.echoDuplicateStart.findMany(
    {
      where: {
        scrimId: scrim.id,
      },
    }
  );

  return echoDuplicateStartsByScrimId;
}

export async function createHeroSpawnRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.hero_spawn === "undefined" ||
    data.hero_spawn.length === 0 ||
    !data.hero_spawn
  ) {
    Logger.log("No hero spawns found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.heroSpawn.createMany({
    data: data.hero_spawn.map((spawn) => ({
      scrimId: scrim.id,
      match_time: spawn[1],
      player_team: String(spawn[2]),
      player_name: spawn[3],
      player_hero: spawn[4],
      previous_hero: spawn[5],
      hero_time_played: spawn[6],
      MapDataId: mapId,
    })),
  });

  const heroSpawnsByScrimId = await prisma.heroSpawn.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return heroSpawnsByScrimId;
}

export async function createHeroSwapRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.hero_swap === "undefined" ||
    data.hero_swap.length === 0 ||
    !data.hero_swap
  ) {
    Logger.log("No hero swaps found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.heroSwap.createMany({
    data: data.hero_swap.map((swap) => ({
      scrimId: scrim.id,
      match_time: swap[1],
      player_team: String(swap[2]),
      player_name: swap[3],
      player_hero: swap[4],
      previous_hero: swap[5],
      hero_time_played: swap[6],
      MapDataId: mapId,
    })),
  });

  const heroSwapsByScrimId = await prisma.heroSwap.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return heroSwapsByScrimId;
}

export async function createKillRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.kill === "undefined" ||
    data.kill.length === 0 ||
    !data.kill
  ) {
    Logger.log("No kills found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.kill.createMany({
    data: data.kill.map((kill) => {
      const row = kill as unknown as unknown[];
      const pos1 = parseCoordinate(row[row.length - 2]);
      const pos2 = parseCoordinate(row[row.length - 1]);
      return {
        scrimId: scrim.id,
        match_time: kill[1],
        attacker_team: String(kill[2]),
        attacker_name: kill[3],
        attacker_hero: kill[4],
        victim_team: String(kill[5]),
        victim_name: kill[6],
        victim_hero: kill[7],
        event_ability: kill[8],
        event_damage: kill[9],
        is_critical_hit: kill[10],
        is_environmental: String(kill[11]),
        attacker_x: pos1?.x ?? null,
        attacker_y: pos1?.y ?? null,
        attacker_z: pos1?.z ?? null,
        victim_x: pos2?.x ?? null,
        victim_y: pos2?.y ?? null,
        victim_z: pos2?.z ?? null,
        MapDataId: mapId,
      };
    }),
  });

  const killsByScrimId = await prisma.kill.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return killsByScrimId;
}

export async function createMatchEndRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.match_end === "undefined" ||
    data.match_end.length === 0 ||
    !data.match_end
  ) {
    Logger.log("No match ends found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.matchEnd.createMany({
    data: data.match_end.map((end) => ({
      scrimId: scrim.id,
      match_time: end[1],
      round_number: end[2],
      team_1_score: end[3],
      team_2_score: end[4],
      MapDataId: mapId,
    })),
  });

  const matchEndsByScrimId = await prisma.matchEnd.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return matchEndsByScrimId;
}

export async function createMatchStartRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.match_start === "undefined" ||
    data.match_start.length === 0 ||
    !data.match_start
  ) {
    Logger.log("No match starts found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.matchStart.createMany({
    data: data.match_start.map((start) => ({
      scrimId: scrim.id,
      match_time: start[1],
      map_name: start[2],
      map_type: start[3],
      team_1_name: String(start[4]).trim(),
      team_2_name: String(start[5]).trim(),
      MapDataId: mapId,
    })),
  });

  const matchStartsByScrimId = await prisma.matchStart.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return matchStartsByScrimId;
}

export async function createMercyRezRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.mercy_rez === "undefined" ||
    data.mercy_rez.length === 0 ||
    !data.mercy_rez
  ) {
    Logger.log("No mercy rezzes found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.mercyRez.createMany({
    data: data.mercy_rez.map((rez) => ({
      scrimId: scrim.id,
      match_time: rez[1],
      resurrecter_team: rez[2],
      resurrecter_player: rez[3],
      resurrecter_hero: rez[4],
      resurrectee_team: rez[5],
      resurrectee_player: rez[6],
      resurrectee_hero: rez[7],
      MapDataId: mapId,
    })),
  });

  const mercyRezzesByScrimId = await prisma.mercyRez.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return mercyRezzesByScrimId;
}

export async function createObjectiveCapturedRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.objective_captured === "undefined" ||
    data.objective_captured.length === 0 ||
    !data.objective_captured
  ) {
    Logger.log(
      "No objective captures found for map: ",
      mapId,
      "scrim: ",
      scrim.id
    );
    return [];
  }

  await prisma.objectiveCaptured.createMany({
    data: data.objective_captured.map((capture) => ({
      scrimId: scrim.id,
      match_time: capture[1],
      round_number: capture[2],
      capturing_team: String(capture[3]),
      objective_index: capture[4],
      control_team_1_progress: capture[5],
      control_team_2_progress: capture[6],
      match_time_remaining: capture[7],
      MapDataId: mapId,
    })),
  });

  const objectiveCapturesByScrimId = await prisma.objectiveCaptured.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return objectiveCapturesByScrimId;
}

export async function createObjectiveUpdatedRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.objective_updated === "undefined" ||
    data.objective_updated.length === 0 ||
    !data.objective_updated
  ) {
    Logger.log(
      "No objective updates found for map: ",
      mapId,
      "scrim: ",
      scrim.id
    );
    return [];
  }

  await prisma.objectiveUpdated.createMany({
    data: data.objective_updated.map((update) => ({
      scrimId: scrim.id,
      match_time: update[1],
      round_number: update[2],
      previous_objective_index: update[3],
      current_objective_index: update[4],
      MapDataId: mapId,
    })),
  });

  const objectiveUpdatesByScrimId = await prisma.objectiveUpdated.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return objectiveUpdatesByScrimId;
}

export async function createOffensiveAssistRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.offensive_assist === "undefined" ||
    data.offensive_assist.length === 0 ||
    !data.offensive_assist
  ) {
    Logger.log(
      "No offensive assists found for map: ",
      mapId,
      "scrim: ",
      scrim.id
    );
    return [];
  }

  await prisma.offensiveAssist.createMany({
    data: data.offensive_assist.map((assist) => ({
      scrimId: scrim.id,
      match_time: assist[1],
      player_team: String(assist[2]),
      player_name: assist[3],
      player_hero: assist[4],
      hero_duplicated: String(assist[5]),
      MapDataId: mapId,
    })),
  });

  const offensiveAssistsByScrimId = await prisma.offensiveAssist.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return offensiveAssistsByScrimId;
}

export async function createPayloadProgressRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.payload_progress === "undefined" ||
    data.payload_progress.length === 0 ||
    !data.payload_progress
  ) {
    Logger.log(
      "No payload progress found for map: ",
      mapId,
      "scrim: ",
      scrim.id
    );
    return [];
  }

  await prisma.payloadProgress.createMany({
    data: data.payload_progress.map((progress) => ({
      scrimId: scrim.id,
      match_time: progress[1],
      round_number: progress[2],
      capturing_team: String(progress[3]),
      objective_index: progress[4],
      payload_capture_progress: progress[5],
      MapDataId: mapId,
    })),
  });

  const payloadProgressesByScrimId = await prisma.payloadProgress.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return payloadProgressesByScrimId;
}

export async function createPlayerStatRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.player_stat === "undefined" ||
    data.player_stat.length === 0 ||
    !data.kill
  ) {
    Logger.log("No player stats found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.playerStat.createMany({
    data: data.player_stat.map((stat) => ({
      scrimId: scrim.id,
      match_time: stat[1],
      round_number: stat[2],
      player_team: String(stat[3]),
      player_name: stat[4],
      player_hero: stat[5],
      eliminations: stat[6],
      final_blows: stat[7],
      deaths: stat[8],
      all_damage_dealt: stat[9],
      barrier_damage_dealt: stat[10],
      hero_damage_dealt: stat[11],
      healing_dealt: stat[12],
      healing_received: stat[13],
      self_healing: stat[14],
      damage_taken: stat[15],
      damage_blocked: stat[16],
      defensive_assists: stat[17],
      offensive_assists: stat[18],
      ultimates_earned: stat[19],
      ultimates_used: stat[20],
      multikill_best: stat[21],
      multikills: stat[22],
      solo_kills: stat[23],
      objective_kills: stat[24],
      environmental_kills: stat[25],
      environmental_deaths: stat[26],
      critical_hits: stat[27],
      critical_hit_accuracy: stat[28],
      scoped_accuracy: stat[29],
      scoped_critical_hit_accuracy: stat[30],
      scoped_critical_hit_kills: stat[31],
      shots_fired: stat[32],
      shots_hit: stat[33],
      shots_missed: stat[34],
      scoped_shots: stat[35],
      scoped_shots_hit: stat[36],
      weapon_accuracy: stat[37],
      hero_time_played: stat[38],
      MapDataId: mapId,
    })),
  });

  const playerStatsByScrimId = await prisma.playerStat.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return playerStatsByScrimId;
}

export async function createPointProgressRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.point_progress === "undefined" ||
    data.point_progress.length === 0 ||
    !data.point_progress
  ) {
    Logger.log("No point progress found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.pointProgress.createMany({
    data: data.point_progress.map((progress) => ({
      scrimId: scrim.id,
      match_time: progress[1],
      round_number: progress[2],
      capturing_team: String(progress[3]),
      objective_index: progress[4],
      point_capture_progress: progress[5],
      MapDataId: mapId,
    })),
  });

  const pointProgressesByScrimId = await prisma.pointProgress.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return pointProgressesByScrimId;
}

export async function createRemechChargedRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.remech_charged === "undefined" ||
    data.remech_charged.length === 0 ||
    !data.remech_charged
  ) {
    Logger.log(
      "No remech chargeds found for map: ",
      mapId,
      "scrim: ",
      scrim.id
    );
    return [];
  }

  await prisma.remechCharged.createMany({
    data: data.remech_charged.map((charged) => ({
      scrimId: scrim.id,
      match_time: charged[1],
      player_team: String(charged[2]),
      player_name: charged[3],
      player_hero: charged[4],
      hero_duplicated: String(charged[5]),
      ultimate_id: charged[6],
      MapDataId: mapId,
    })),
  });

  const remechChargedsByScrimId = await prisma.remechCharged.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return remechChargedsByScrimId;
}

export async function createRoundEndRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.round_end === "undefined" ||
    data.round_end.length === 0 ||
    !data.round_end
  ) {
    Logger.log("No round ends found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.roundEnd.createMany({
    data: data.round_end.map((end) => ({
      scrimId: scrim.id,
      match_time: end[1],
      round_number: end[2],
      capturing_team: String(end[3]),
      team_1_score: end[4],
      team_2_score: end[5],
      objective_index: end[6],
      control_team_1_progress: end[7],
      control_team_2_progress: end[8],
      match_time_remaining: end[9],
      MapDataId: mapId,
    })),
  });

  const roundEndsByScrimId = await prisma.roundEnd.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return roundEndsByScrimId;
}

export async function createRoundStartRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.round_start === "undefined" ||
    data.round_start.length === 0 ||
    !data.round_start
  ) {
    Logger.log("No round starts found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.roundStart.createMany({
    data: data.round_start.map((start) => ({
      scrimId: scrim.id,
      match_time: start[1],
      round_number: start[2],
      capturing_team: String(start[3]),
      team_1_score: start[4],
      team_2_score: start[5],
      objective_index: start[6],
      MapDataId: mapId,
    })),
  });

  const roundStartsByScrimId = await prisma.roundStart.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return roundStartsByScrimId;
}

export async function createSetupCompleteRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.setup_complete === "undefined" ||
    data.setup_complete.length === 0 ||
    !data.setup_complete
  ) {
    Logger.log(
      "No setup completes found for map: ",
      mapId,
      "scrim: ",
      scrim.id
    );
    return [];
  }

  await prisma.setupComplete.createMany({
    data: data.setup_complete.map((complete) => ({
      scrimId: scrim.id,
      match_time: complete[1],
      round_number: complete[2],
      match_time_remaining: complete[3],
      MapDataId: mapId,
    })),
  });

  const setupCompletesByScrimId = await prisma.setupComplete.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return setupCompletesByScrimId;
}

export async function createUltimateChargedRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.ultimate_charged === "undefined" ||
    data.ultimate_charged.length === 0 ||
    !data.ultimate_charged
  ) {
    Logger.log(
      "No ultimate charges found for map: ",
      mapId,
      "scrim: ",
      scrim.id
    );
    return [];
  }

  await prisma.ultimateCharged.createMany({
    data: data.ultimate_charged.map((charged) => ({
      scrimId: scrim.id,
      match_time: charged[1],
      player_team: String(charged[2]),
      player_name: charged[3],
      player_hero: charged[4],
      hero_duplicated: String(charged[5]),
      ultimate_id: charged[6],
      MapDataId: mapId,
    })),
  });

  const ultimateChargedsByScrimId = await prisma.ultimateCharged.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return ultimateChargedsByScrimId;
}

export async function createUltimateEndRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.ultimate_end === "undefined" ||
    data.ultimate_end.length === 0 ||
    !data.ultimate_end
  ) {
    Logger.log("No ultimate ends found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.ultimateEnd.createMany({
    data: data.ultimate_end.map((end) => {
      const row = end as unknown as unknown[];
      const pos = parseCoordinate(row[row.length - 1]);
      return {
        scrimId: scrim.id,
        match_time: end[1],
        player_team: String(end[2]),
        player_name: end[3],
        player_hero: end[4] ?? "",
        hero_duplicated: String(end[5]),
        ultimate_id: end[6],
        player_x: pos?.x ?? null,
        player_y: pos?.y ?? null,
        player_z: pos?.z ?? null,
        MapDataId: mapId,
      };
    }),
  });

  const ultimateEndsByScrimId = await prisma.ultimateEnd.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return ultimateEndsByScrimId;
}

export async function createUltimateStartRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.ultimate_start === "undefined" ||
    data.ultimate_start.length === 0 ||
    !data.ultimate_start
  ) {
    Logger.log(
      "No ultimate starts found for map: ",
      mapId,
      "scrim: ",
      scrim.id
    );
    return [];
  }

  await prisma.ultimateStart.createMany({
    data: data.ultimate_start.map((start) => {
      const row = start as unknown as unknown[];
      const pos = parseCoordinate(row[row.length - 1]);
      return {
        scrimId: scrim.id,
        match_time: start[1],
        player_team: String(start[2]),
        player_name: start[3],
        player_hero: start[4],
        hero_duplicated: String(start[5]),
        ultimate_id: start[6],
        player_x: pos?.x ?? null,
        player_y: pos?.y ?? null,
        player_z: pos?.z ?? null,
        MapDataId: mapId,
      };
    }),
  });

  const ultimateStartsByScrimId = await prisma.ultimateStart.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return ultimateStartsByScrimId;
}

export async function createAbility1UsedRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.ability_1_used === "undefined" ||
    data.ability_1_used.length === 0 ||
    !data.ability_1_used
  ) {
    Logger.log("No ability 1 used found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.ability1Used.createMany({
    data: data.ability_1_used.map((ability) => {
      const row = ability as unknown as unknown[];
      const pos = parseCoordinate(row[row.length - 1]);
      return {
        scrimId: scrim.id,
        match_time: ability[1],
        player_team: String(ability[2]),
        player_name: ability[3],
        player_hero: ability[4],
        hero_duplicated: String(ability[5]),
        player_x: pos?.x ?? null,
        player_y: pos?.y ?? null,
        player_z: pos?.z ?? null,
        MapDataId: mapId,
      };
    }),
  });

  const ability1UsedByScrimId = await prisma.ability1Used.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return ability1UsedByScrimId;
}

export async function createAbility2UsedRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.ability_2_used === "undefined" ||
    data.ability_2_used.length === 0 ||
    !data.ability_2_used
  ) {
    Logger.log("No ability 2 used found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.ability2Used.createMany({
    data: data.ability_2_used.map((ability) => {
      const row = ability as unknown as unknown[];
      const pos = parseCoordinate(row[row.length - 1]);
      return {
        scrimId: scrim.id,
        match_time: ability[1],
        player_team: String(ability[2]),
        player_name: ability[3],
        player_hero: ability[4],
        hero_duplicated: String(ability[5]),
        player_x: pos?.x ?? null,
        player_y: pos?.y ?? null,
        player_z: pos?.z ?? null,
        MapDataId: mapId,
      };
    }),
  });

  const ability2UsedByScrimId = await prisma.ability2Used.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return ability2UsedByScrimId;
}

export async function createDamageRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.damage === "undefined" ||
    data.damage.length === 0 ||
    !data.damage
  ) {
    Logger.log("No damage found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.damage.createMany({
    data: data.damage.map((dmg) => {
      const row = dmg as unknown as unknown[];
      const pos1 = parseCoordinate(row[row.length - 2]);
      const pos2 = parseCoordinate(row[row.length - 1]);
      return {
        scrimId: scrim.id,
        match_time: dmg[1],
        attacker_team: String(dmg[2]),
        attacker_name: dmg[3],
        attacker_hero: dmg[4],
        victim_team: String(dmg[5]),
        victim_name: dmg[6],
        victim_hero: dmg[7],
        event_ability: dmg[8],
        event_damage: dmg[9],
        is_critical_hit: dmg[10],
        is_environmental: String(dmg[11]),
        attacker_x: pos1?.x ?? null,
        attacker_y: pos1?.y ?? null,
        attacker_z: pos1?.z ?? null,
        victim_x: pos2?.x ?? null,
        victim_y: pos2?.y ?? null,
        victim_z: pos2?.z ?? null,
        MapDataId: mapId,
      };
    }),
  });

  const damageByScrimId = await prisma.damage.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return damageByScrimId;
}

export async function createHealingRows(
  data: ParserData,
  scrim: { id: number },
  mapId: number
) {
  if (
    typeof data.healing === "undefined" ||
    data.healing.length === 0 ||
    !data.healing
  ) {
    Logger.log("No healing found for map: ", mapId, "scrim: ", scrim.id);
    return [];
  }

  await prisma.healing.createMany({
    data: data.healing.map((heal) => {
      const row = heal as unknown as unknown[];
      const pos1 = parseCoordinate(row[row.length - 2]);
      const pos2 = parseCoordinate(row[row.length - 1]);
      return {
        scrimId: scrim.id,
        match_time: heal[1],
        healer_team: String(heal[2]),
        healer_name: heal[3],
        healer_hero: heal[4],
        healee_team: String(heal[5]),
        healee_name: heal[6],
        healee_hero: heal[7],
        event_ability: heal[8],
        event_healing: heal[9],
        is_health_pack: heal[10],
        healer_x: pos1?.x ?? null,
        healer_y: pos1?.y ?? null,
        healer_z: pos1?.z ?? null,
        healee_x: pos2?.x ?? null,
        healee_y: pos2?.y ?? null,
        healee_z: pos2?.z ?? null,
        MapDataId: mapId,
      };
    }),
  });

  const healingByScrimId = await prisma.healing.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return healingByScrimId;
}
