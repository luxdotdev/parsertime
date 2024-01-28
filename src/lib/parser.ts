import { CreateScrimRequestData } from "@/app/api/(scrim)/create-scrim/route";
import { EventType, ParserData } from "@/types/parser";
import { Session } from "next-auth";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { CreateMapRequestData } from "@/app/api/(scrim)/add-map/route";
import { toTitleCase } from "@/lib/utils";

export async function parseData(file: File) {
  const reader = new FileReader();

  const data = await new Promise((resolve, reject) => {
    reader.onload = (e: ProgressEvent<FileReader>) => resolve(e.target?.result);
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });

  const workbook = XLSX.read(data, { type: "binary" });
  const sheetName = workbook.SheetNames as EventType[];

  const result: Partial<ParserData> = {};

  // for each sheet, convert to json and add it to the result object.
  for (const sheet of sheetName) {
    const json = XLSX.utils
      .sheet_to_json(workbook.Sheets[sheet], {
        header: 1,
      })
      .slice(1);
    result[sheet] = json as any; // cast to any because we don't know the exact type
  }

  return result as ParserData; // cast to ParserData because we know the structure matches
}

export async function createNewScrimFromParsedData(
  data: CreateScrimRequestData,
  session: Session
) {
  const userId = await prisma.user.findUnique({
    where: {
      email: session.user?.email ?? "",
    },
  });

  if (!userId) {
    throw new Error("User not found");
  }

  const scrim = await prisma.scrim.create({
    data: {
      name: data.name ?? "New Scrim",
      date: data.date ?? new Date(),
      createdAt: new Date(),
      creatorId: userId.id,
      teamId: parseInt(data.team),
    },
  });

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
      mapData: {
        connect: {
          id: mapData.id,
        },
      },
    },
  });

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

  await createDefensiveAssistsRows(firstMap, scrim, map.id);
  await createHeroSpawnRows(firstMap, scrim, map.id);
  await createHeroSwapRows(firstMap, scrim, map.id);
  await createKillRows(firstMap, scrim, map.id);
  await createMatchEndRows(firstMap, scrim, map.id);
  await createMatchStartRows(firstMap, scrim, map.id);
  await createObjectiveCapturedRows(firstMap, scrim, map.id);
  await createObjectiveUpdatedRows(firstMap, scrim, map.id);
  await createOffensiveAssistRows(firstMap, scrim, map.id);
  await createPayloadProgressRows(firstMap, scrim, map.id);
  await createPlayerStatRows(firstMap, scrim, map.id);
  await createPointProgressRows(firstMap, scrim, map.id);
  await createRoundEndRows(firstMap, scrim, map.id);
  await createRoundStartRows(firstMap, scrim, map.id);
  await createSetupCompleteRows(firstMap, scrim, map.id);
  await createUltimateChargedRows(firstMap, scrim, map.id);
  await createUltimateEndRows(firstMap, scrim, map.id);
  await createUltimateStartRows(firstMap, scrim, map.id);
}

export async function createNewMap(
  data: CreateMapRequestData,
  session: Session
) {
  const userId = await prisma.user.findUnique({
    where: {
      email: session.user?.email ?? "",
    },
  });

  if (!userId) {
    throw new Error("User not found");
  }

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

  await createDefensiveAssistsRows(data.map, { id: data.scrimId }, map.id);
  await createHeroSpawnRows(data.map, { id: data.scrimId }, map.id);
  await createHeroSwapRows(data.map, { id: data.scrimId }, map.id);
  await createKillRows(data.map, { id: data.scrimId }, map.id);
  await createMatchEndRows(data.map, { id: data.scrimId }, map.id);
  await createMatchStartRows(data.map, { id: data.scrimId }, map.id);
  await createObjectiveCapturedRows(data.map, { id: data.scrimId }, map.id);
  await createObjectiveUpdatedRows(data.map, { id: data.scrimId }, map.id);
  await createOffensiveAssistRows(data.map, { id: data.scrimId }, map.id);
  await createPayloadProgressRows(data.map, { id: data.scrimId }, map.id);
  await createPlayerStatRows(data.map, { id: data.scrimId }, map.id);
  await createPointProgressRows(data.map, { id: data.scrimId }, map.id);
  await createRoundEndRows(data.map, { id: data.scrimId }, map.id);
  await createRoundStartRows(data.map, { id: data.scrimId }, map.id);
  await createSetupCompleteRows(data.map, { id: data.scrimId }, map.id);
  await createUltimateChargedRows(data.map, { id: data.scrimId }, map.id);
  await createUltimateEndRows(data.map, { id: data.scrimId }, map.id);
  await createUltimateStartRows(data.map, { id: data.scrimId }, map.id);
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
    return [];
  }

  await prisma.defensiveAssist.createMany({
    data: data.defensive_assist.map((assist) => ({
      scrimId: scrim.id,
      match_time: assist[1],
      player_team: assist[2],
      player_name: assist[3],
      player_hero: assist[4],
      hero_duplicated: assist[5],
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
    return [];
  }

  await prisma.heroSpawn.createMany({
    data: data.hero_spawn.map((spawn) => ({
      scrimId: scrim.id,
      match_time: spawn[1],
      player_team: spawn[2],
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
    return [];
  }

  await prisma.heroSwap.createMany({
    data: data.hero_swap.map((swap) => ({
      scrimId: scrim.id,
      match_time: swap[1],
      player_team: swap[2],
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
    return [];
  }

  await prisma.kill.createMany({
    data: data.kill.map((kill) => ({
      scrimId: scrim.id,
      match_time: kill[1],
      attacker_team: kill[2],
      attacker_name: kill[3],
      attacker_hero: kill[4],
      victim_team: kill[5],
      victim_name: kill[6],
      victim_hero: kill[7],
      event_ability: kill[8],
      event_damage: kill[9],
      is_critical_hit: kill[10],
      is_environmental: String(kill[11]),
      MapDataId: mapId,
    })),
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
    return [];
  }

  await prisma.matchStart.createMany({
    data: data.match_start.map((start) => ({
      scrimId: scrim.id,
      match_time: start[1],
      map_name: start[2],
      map_type: start[3],
      team_1_name: start[4],
      team_2_name: start[5],
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
    return [];
  }

  await prisma.objectiveCaptured.createMany({
    data: data.objective_captured.map((capture) => ({
      scrimId: scrim.id,
      match_time: capture[1],
      round_number: capture[2],
      capturing_team: capture[3],
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
    return [];
  }

  await prisma.offensiveAssist.createMany({
    data: data.offensive_assist.map((assist) => ({
      scrimId: scrim.id,
      match_time: assist[1],
      player_team: assist[2],
      player_name: assist[3],
      player_hero: assist[4],
      hero_duplicated: assist[5],
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
    return [];
  }

  await prisma.payloadProgress.createMany({
    data: data.payload_progress.map((progress) => ({
      scrimId: scrim.id,
      match_time: progress[1],
      round_number: progress[2],
      capturing_team: progress[3],
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
    return [];
  }

  await prisma.playerStat.createMany({
    data: data.player_stat.map((stat) => ({
      scrimId: scrim.id,
      match_time: stat[1],
      round_number: stat[2],
      player_team: stat[3],
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
    return [];
  }

  await prisma.pointProgress.createMany({
    data: data.point_progress.map((progress) => ({
      scrimId: scrim.id,
      match_time: progress[1],
      round_number: progress[2],
      capturing_team: progress[3],
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
    return [];
  }

  await prisma.ultimateCharged.createMany({
    data: data.ultimate_charged.map((charged) => ({
      scrimId: scrim.id,
      match_time: charged[1],
      player_team: charged[2],
      player_name: charged[3],
      player_hero: charged[4],
      hero_duplicated: charged[5],
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
    return [];
  }

  await prisma.ultimateEnd.createMany({
    data: data.ultimate_end.map((end) => ({
      scrimId: scrim.id,
      match_time: end[1],
      player_team: end[2],
      player_name: end[3],
      player_hero: end[4] ?? "",
      hero_duplicated: end[5],
      ultimate_id: end[6],
      MapDataId: mapId,
    })),
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
    return [];
  }

  await prisma.ultimateStart.createMany({
    data: data.ultimate_start.map((start) => ({
      scrimId: scrim.id,
      match_time: start[1],
      player_team: start[2],
      player_name: start[3],
      player_hero: start[4],
      hero_duplicated: start[5],
      ultimate_id: start[6],
      MapDataId: mapId,
    })),
  });

  const ultimateStartsByScrimId = await prisma.ultimateStart.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return ultimateStartsByScrimId;
}
