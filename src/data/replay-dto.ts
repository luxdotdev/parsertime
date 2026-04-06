import {
  getControlSubMapNames,
  isControlMap,
} from "@/lib/map-calibration/control-map-index";
import {
  loadCalibration,
  type LoadedCalibration,
} from "@/lib/map-calibration/load-calibration";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";

export type PositionSample = {
  t: number;
  playerName: string;
  playerTeam: string;
  hero: string;
  x: number;
  z: number;
};

export type KillDisplayEvent = {
  type: "kill";
  t: number;
  attackerName: string;
  attackerTeam: string;
  attackerHero: string;
  victimName: string;
  victimTeam: string;
  victimHero: string;
  ability: string;
  damage: number;
};

export type UltDisplayEvent = {
  type: "ult_start" | "ult_end" | "ult_charged";
  t: number;
  playerName: string;
  playerTeam: string;
  playerHero: string;
  ultimateId: number;
};

export type HeroSwapDisplayEvent = {
  type: "hero_swap";
  t: number;
  playerName: string;
  playerTeam: string;
  playerHero: string;
  previousHero: string;
};

export type RoundDisplayEvent = {
  type: "round_start" | "round_end";
  t: number;
  roundNumber: number;
  objectiveIndex: number;
};

export type DisplayEvent =
  | KillDisplayEvent
  | UltDisplayEvent
  | HeroSwapDisplayEvent
  | RoundDisplayEvent;

export type ReplayCalibration = {
  calibrations: Record<string, LoadedCalibration>;
  mapName: string;
  mapType: string;
  roundStarts: { matchTime: number; objectiveIndex: number }[];
};

export type ReplayData =
  | {
      type: "ready";
      positionSamples: PositionSample[];
      displayEvents: DisplayEvent[];
      calibration: ReplayCalibration;
      team1Name: string;
      team2Name: string;
    }
  | { type: "no_calibration" }
  | { type: "no_coordinates" };

function pushSample(
  samples: PositionSample[],
  t: number,
  playerName: string,
  playerTeam: string,
  hero: string,
  x: number | null,
  z: number | null
) {
  if (x != null && z != null) {
    samples.push({ t, playerName, playerTeam, hero, x, z });
  }
}

export async function getReplayData(mapDataId: number): Promise<ReplayData> {
  const matchStart = await prisma.matchStart.findFirst({
    where: { MapDataId: mapDataId },
    select: {
      map_name: true,
      map_type: true,
      team_1_name: true,
      team_2_name: true,
    },
  });

  if (!matchStart) return { type: "no_calibration" };

  const [
    kills,
    damage,
    healing,
    ability1,
    ability2,
    ultStarts,
    ultEnds,
    ultCharged,
    heroSwaps,
    roundStarts,
    roundEnds,
  ] = await Promise.all([
    prisma.kill.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        attacker_name: true,
        attacker_team: true,
        attacker_hero: true,
        attacker_x: true,
        attacker_z: true,
        victim_name: true,
        victim_team: true,
        victim_hero: true,
        victim_x: true,
        victim_z: true,
        event_ability: true,
        event_damage: true,
      },
    }),
    prisma.damage.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        attacker_name: true,
        attacker_team: true,
        attacker_hero: true,
        attacker_x: true,
        attacker_z: true,
        victim_name: true,
        victim_team: true,
        victim_hero: true,
        victim_x: true,
        victim_z: true,
      },
    }),
    prisma.healing.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        healer_name: true,
        healer_team: true,
        healer_hero: true,
        healer_x: true,
        healer_z: true,
        healee_name: true,
        healee_team: true,
        healee_hero: true,
        healee_x: true,
        healee_z: true,
      },
    }),
    prisma.ability1Used.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_hero: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.ability2Used.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_hero: true,
        player_x: true,
        player_z: true,
      },
    }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_hero: true,
        player_x: true,
        player_z: true,
        ultimate_id: true,
      },
    }),
    prisma.ultimateEnd.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_hero: true,
        player_x: true,
        player_z: true,
        ultimate_id: true,
      },
    }),
    prisma.ultimateCharged.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_hero: true,
        ultimate_id: true,
      },
    }),
    prisma.heroSwap.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        player_name: true,
        player_team: true,
        player_hero: true,
        previous_hero: true,
      },
    }),
    prisma.roundStart.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        round_number: true,
        objective_index: true,
      },
      orderBy: { match_time: "asc" },
    }),
    prisma.roundEnd.findMany({
      where: { MapDataId: mapDataId },
      select: {
        match_time: true,
        round_number: true,
        objective_index: true,
      },
      orderBy: { match_time: "asc" },
    }),
  ]);

  const hasCoords =
    kills.some((e) => e.attacker_x != null || e.victim_x != null) ||
    damage.some((e) => e.attacker_x != null || e.victim_x != null) ||
    healing.some((e) => e.healer_x != null || e.healee_x != null) ||
    ability1.some((e) => e.player_x != null) ||
    ability2.some((e) => e.player_x != null) ||
    ultStarts.some((e) => e.player_x != null) ||
    ultEnds.some((e) => e.player_x != null);

  if (!hasCoords) return { type: "no_coordinates" };

  const positionSamples: PositionSample[] = [];

  for (const k of kills) {
    pushSample(
      positionSamples,
      k.match_time,
      k.attacker_name,
      k.attacker_team,
      k.attacker_hero,
      k.attacker_x,
      k.attacker_z
    );
    pushSample(
      positionSamples,
      k.match_time,
      k.victim_name,
      k.victim_team,
      k.victim_hero,
      k.victim_x,
      k.victim_z
    );
  }

  for (const d of damage) {
    pushSample(
      positionSamples,
      d.match_time,
      d.attacker_name,
      d.attacker_team,
      d.attacker_hero,
      d.attacker_x,
      d.attacker_z
    );
    pushSample(
      positionSamples,
      d.match_time,
      d.victim_name,
      d.victim_team,
      d.victim_hero,
      d.victim_x,
      d.victim_z
    );
  }

  for (const h of healing) {
    pushSample(
      positionSamples,
      h.match_time,
      h.healer_name,
      h.healer_team,
      h.healer_hero,
      h.healer_x,
      h.healer_z
    );
    pushSample(
      positionSamples,
      h.match_time,
      h.healee_name,
      h.healee_team,
      h.healee_hero,
      h.healee_x,
      h.healee_z
    );
  }

  for (const a of ability1) {
    pushSample(
      positionSamples,
      a.match_time,
      a.player_name,
      a.player_team,
      a.player_hero,
      a.player_x,
      a.player_z
    );
  }

  for (const a of ability2) {
    pushSample(
      positionSamples,
      a.match_time,
      a.player_name,
      a.player_team,
      a.player_hero,
      a.player_x,
      a.player_z
    );
  }

  for (const u of ultStarts) {
    pushSample(
      positionSamples,
      u.match_time,
      u.player_name,
      u.player_team,
      u.player_hero,
      u.player_x,
      u.player_z
    );
  }

  for (const u of ultEnds) {
    pushSample(
      positionSamples,
      u.match_time,
      u.player_name,
      u.player_team,
      u.player_hero,
      u.player_x,
      u.player_z
    );
  }

  positionSamples.sort((a, b) => a.t - b.t);

  const displayEvents: DisplayEvent[] = [];

  for (const k of kills) {
    displayEvents.push({
      type: "kill",
      t: k.match_time,
      attackerName: k.attacker_name,
      attackerTeam: k.attacker_team,
      attackerHero: k.attacker_hero,
      victimName: k.victim_name,
      victimTeam: k.victim_team,
      victimHero: k.victim_hero,
      ability: k.event_ability,
      damage: k.event_damage,
    });
  }

  for (const u of ultStarts) {
    displayEvents.push({
      type: "ult_start",
      t: u.match_time,
      playerName: u.player_name,
      playerTeam: u.player_team,
      playerHero: u.player_hero,
      ultimateId: u.ultimate_id,
    });
  }

  for (const u of ultEnds) {
    displayEvents.push({
      type: "ult_end",
      t: u.match_time,
      playerName: u.player_name,
      playerTeam: u.player_team,
      playerHero: u.player_hero,
      ultimateId: u.ultimate_id,
    });
  }

  for (const u of ultCharged) {
    displayEvents.push({
      type: "ult_charged",
      t: u.match_time,
      playerName: u.player_name,
      playerTeam: u.player_team,
      playerHero: u.player_hero,
      ultimateId: u.ultimate_id,
    });
  }

  for (const h of heroSwaps) {
    displayEvents.push({
      type: "hero_swap",
      t: h.match_time,
      playerName: h.player_name,
      playerTeam: h.player_team,
      playerHero: h.player_hero,
      previousHero: h.previous_hero,
    });
  }

  for (const r of roundStarts) {
    displayEvents.push({
      type: "round_start",
      t: r.match_time,
      roundNumber: r.round_number,
      objectiveIndex: r.objective_index,
    });
  }

  for (const r of roundEnds) {
    displayEvents.push({
      type: "round_end",
      t: r.match_time,
      roundNumber: r.round_number,
      objectiveIndex: r.objective_index,
    });
  }

  displayEvents.sort((a, b) => a.t - b.t);

  const calibration = await loadReplayCalibration(
    matchStart.map_name,
    matchStart.map_type,
    mapDataId,
    roundStarts
  );

  if (!calibration) return { type: "no_calibration" };

  return {
    type: "ready",
    positionSamples,
    displayEvents,
    calibration,
    team1Name: matchStart.team_1_name,
    team2Name: matchStart.team_2_name,
  };
}

async function loadReplayCalibration(
  mapName: string,
  mapType: $Enums.MapType,
  mapDataId: number,
  roundStarts: { match_time: number; objective_index: number }[]
): Promise<ReplayCalibration | null> {
  const calibrations: Record<string, LoadedCalibration> = {};

  if (mapType === $Enums.MapType.Control && isControlMap(mapName)) {
    const allSubMapNames = getControlSubMapNames(mapName);
    for (const subMapName of allSubMapNames) {
      const cal = await loadCalibration(subMapName);
      if (cal) calibrations[subMapName] = cal;
    }

    if (Object.keys(calibrations).length === 0) return null;

    return {
      calibrations,
      mapName,
      mapType,
      roundStarts: roundStarts.map((r) => ({
        matchTime: r.match_time,
        objectiveIndex: r.objective_index,
      })),
    };
  }

  const cal = await loadCalibration(mapName);
  if (!cal) return null;

  calibrations[mapName] = cal;

  return {
    calibrations,
    mapName,
    mapType,
    roundStarts: [],
  };
}
