import { EventType, ParserData } from "@/types/parser";
import { PrismaClient } from "@prisma/client";
import { Session } from "next-auth";
import * as XLSX from "xlsx";

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
  prisma: PrismaClient,
  data: ParserData,
  session: Session
) {
  await prisma.$connect();

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
      name: "New Scrim",
      date: new Date(),
      createdAt: new Date(),
      creatorId: userId.id,
    },
  });

  const mapData = await prisma.mapData.create({
    data: {
      scrimId: scrim.id,
      userId: userId.id,
    },
  });

  const defensive_assists = await createDefensiveAssistsRows(
    prisma,
    data,
    scrim
  );
  const hero_spawns = await createHeroSpawnRows(prisma, data, scrim);
  const hero_swaps = await createHeroSwapRows(prisma, data, scrim);
  const kills = await createKillRows(prisma, data, scrim);
  const match_end = await createMatchEndRows(prisma, data, scrim);
  const match_starts = await createMatchStartRows(prisma, data, scrim);
  const objective_captured = await createObjectiveCapturedRows(
    prisma,
    data,
    scrim
  );
  const objective_updated = await createObjectiveUpdatedRows(
    prisma,
    data,
    scrim
  );
  const offensive_assists = await createOffensiveAssistRows(
    prisma,
    data,
    scrim
  );
  const payload_progress = await createPayloadProgressRows(prisma, data, scrim);
  const player_stat = await createPlayerStatRows(prisma, data, scrim);
  const round_end = await createRoundEndRows(prisma, data, scrim);
  const round_start = await createRoundStartRows(prisma, data, scrim);
  const setup_complete = await createSetupCompleteRows(prisma, data, scrim);
  const ultimate_charged = await createUltimateChargedRows(prisma, data, scrim);
  const ultimate_end = await createUltimateEndRows(prisma, data, scrim);
  const ultimate_start = await createUltimateStartRows(prisma, data, scrim);

  await prisma.mapData.update({
    where: {
      id: mapData.id,
    },
    data: {
      defensive_assist: {
        connect: [...defensive_assists.map((assist) => ({ id: assist.id }))],
      },
      hero_spawn: {
        connect: [...hero_spawns.map((spawn) => ({ id: spawn.id }))],
      },
      hero_swap: {
        connect: [...hero_swaps.map((swap) => ({ id: swap.id }))],
      },
      kill: {
        connect: [...kills.map((kill) => ({ id: kill.id }))],
      },
      match_end: {
        connect: [...match_end.map((end) => ({ id: end.id }))],
      },
      match_start: {
        connect: [...match_starts.map((start) => ({ id: start.id }))],
      },
      objective_captured: {
        connect: [...objective_captured.map((capture) => ({ id: capture.id }))],
      },
      objective_updated: {
        connect: [...objective_updated.map((update) => ({ id: update.id }))],
      },
      offensive_assist: {
        connect: [...offensive_assists.map((assist) => ({ id: assist.id }))],
      },
      payload_progress: {
        connect: [...payload_progress.map((progress) => ({ id: progress.id }))],
      },
      player_stat: {
        connect: [...player_stat.map((stat) => ({ id: stat.id }))],
      },
      point_progress: {
        connect: [...payload_progress.map((progress) => ({ id: progress.id }))],
      },
      round_end: {
        connect: [...round_end.map((end) => ({ id: end.id }))],
      },
      round_start: {
        connect: [...round_start.map((start) => ({ id: start.id }))],
      },
      setup_complete: {
        connect: [...setup_complete.map((complete) => ({ id: complete.id }))],
      },
      ultimate_charged: {
        connect: [...ultimate_charged.map((charged) => ({ id: charged.id }))],
      },
      ultimate_end: {
        connect: [...ultimate_end.map((end) => ({ id: end.id }))],
      },
      ultimate_start: {
        connect: [...ultimate_start.map((start) => ({ id: start.id }))],
      },
    },
  });

  const map = await prisma.map.create({
    data: {
      name: "New Map",
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

  await prisma.$disconnect();
}

export async function createDefensiveAssistsRows(
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
  await prisma.defensiveAssist.createMany({
    data: data.defensive_assist.map((assist) => ({
      scrimId: scrim.id,
      match_time: assist[1],
      player_team: assist[2],
      player_name: assist[3],
      player_hero: assist[4],
      hero_duplicated: assist[5],
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
  await prisma.heroSpawn.createMany({
    data: data.hero_spawn.map((spawn) => ({
      scrimId: scrim.id,
      match_time: spawn[1],
      player_team: spawn[2],
      player_name: spawn[3],
      player_hero: spawn[4],
      previous_hero: spawn[5],
      hero_time_played: spawn[6],
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
  await prisma.heroSwap.createMany({
    data: data.hero_swap.map((swap) => ({
      scrimId: scrim.id,
      match_time: swap[1],
      player_team: swap[2],
      player_name: swap[3],
      player_hero: swap[4],
      previous_hero: swap[5],
      hero_time_played: swap[6],
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
  await prisma.matchStart.createMany({
    data: data.match_start.map((start) => ({
      scrimId: scrim.id,
      match_time: start[1],
      map_name: start[2],
      map_type: start[3],
      team_1_name: start[4],
      team_2_name: start[5],
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
  await prisma.objectiveUpdated.createMany({
    data: data.objective_updated.map((update) => ({
      scrimId: scrim.id,
      match_time: update[1],
      round_number: update[2],
      previous_objective_index: update[3],
      current_objective_index: update[4],
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
  await prisma.offensiveAssist.createMany({
    data: data.offensive_assist.map((assist) => ({
      scrimId: scrim.id,
      match_time: assist[1],
      player_team: assist[2],
      player_name: assist[3],
      player_hero: assist[4],
      hero_duplicated: assist[5],
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
  await prisma.roundStart.createMany({
    data: data.round_start.map((start) => ({
      scrimId: scrim.id,
      match_time: start[1],
      round_number: start[2],
      capturing_team: String(start[3]),
      team_1_score: start[4],
      team_2_score: start[5],
      objective_index: start[6],
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
  await prisma.setupComplete.createMany({
    data: data.setup_complete.map((complete) => ({
      scrimId: scrim.id,
      match_time: complete[1],
      round_number: complete[2],
      match_time_remaining: complete[3],
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
  await prisma.ultimateCharged.createMany({
    data: data.ultimate_charged.map((charged) => ({
      scrimId: scrim.id,
      match_time: charged[1],
      player_team: charged[2],
      player_name: charged[3],
      player_hero: charged[4],
      hero_duplicated: charged[5],
      ultimate_id: charged[6],
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
  await prisma.ultimateEnd.createMany({
    data: data.ultimate_end.map((end) => ({
      scrimId: scrim.id,
      match_time: end[1],
      player_team: end[2],
      player_name: end[3],
      player_hero: end[4] ?? "",
      hero_duplicated: end[5],
      ultimate_id: end[6],
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
  prisma: PrismaClient,
  data: ParserData,
  scrim: { id: number }
) {
  await prisma.ultimateStart.createMany({
    data: data.ultimate_start.map((start) => ({
      scrimId: scrim.id,
      match_time: start[1],
      player_team: start[2],
      player_name: start[3],
      player_hero: start[4],
      hero_duplicated: start[5],
      ultimate_id: start[6],
    })),
  });

  const ultimateStartsByScrimId = await prisma.ultimateStart.findMany({
    where: {
      scrimId: scrim.id,
    },
  });

  return ultimateStartsByScrimId;
}
