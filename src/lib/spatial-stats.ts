import prisma from "@/lib/prisma";
import { groupEventsIntoFights, mercyRezToKillEvent, round } from "@/lib/utils";

/** Minimum attacker-over-victim height difference (meters) to call a kill "high ground". */
export const HIGH_GROUND_DELTA = 5.0;
/** A death is isolated when no teammate is within this many meters. */
export const ISOLATION_RADIUS = 15;
/** Position samples are valid for this many seconds before the moment of interest. */
export const POSITION_WINDOW_SEC = 10;
/** Below this many usable samples, a stat is null rather than misleading. */
export const MIN_SAMPLES = 5;
/** Below this share of relevant events carrying coordinates, a stat is null. */
export const MIN_COVERAGE = 0.5;

export const SPATIAL_STAT_TYPES = [
  "AVERAGE_ENGAGEMENT_DISTANCE",
  "HIGH_GROUND_KILL_PERCENTAGE",
  "ISOLATION_DEATH_PERCENTAGE",
  "AVERAGE_FIGHT_START_SPREAD",
] as const;

export type CoordKill = {
  match_time: number;
  attacker_name: string;
  attacker_team: string;
  victim_name: string;
  victim_team: string;
  attacker_x: number | null;
  attacker_y: number | null;
  attacker_z: number | null;
  victim_x: number | null;
  victim_y: number | null;
  victim_z: number | null;
};

export type SpatialPositionSample = {
  match_time: number;
  playerName: string;
  playerTeam: string;
  x: number;
  y: number;
  z: number;
};

function distance3d(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number
) {
  return Math.hypot(ax - bx, ay - by, az - bz);
}

export function computeAverageEngagementDistance(
  kills: CoordKill[],
  playerName: string
): number | null {
  const playerKills = kills.filter((k) => k.attacker_name === playerName);
  const withCoords = playerKills.filter(
    (k) =>
      k.attacker_x != null &&
      k.attacker_y != null &&
      k.attacker_z != null &&
      k.victim_x != null &&
      k.victim_y != null &&
      k.victim_z != null
  );

  if (
    withCoords.length < MIN_SAMPLES ||
    withCoords.length / playerKills.length < MIN_COVERAGE
  ) {
    return null;
  }

  const total = withCoords.reduce(
    (acc, k) =>
      acc +
      distance3d(
        k.attacker_x!,
        k.attacker_y!,
        k.attacker_z!,
        k.victim_x!,
        k.victim_y!,
        k.victim_z!
      ),
    0
  );

  return round(total / withCoords.length);
}

export function computeHighGroundKillPercentage(
  kills: CoordKill[],
  playerName: string
): number | null {
  const playerKills = kills.filter((k) => k.attacker_name === playerName);
  const withY = playerKills.filter(
    (k) => k.attacker_y != null && k.victim_y != null
  );

  if (
    withY.length < MIN_SAMPLES ||
    withY.length / playerKills.length < MIN_COVERAGE
  ) {
    return null;
  }

  const highGround = withY.filter(
    (k) => k.attacker_y! - k.victim_y! >= HIGH_GROUND_DELTA
  );

  return round((highGround.length / withY.length) * 100);
}

/**
 * For each player, the nearest position sample within
 * [time - POSITION_WINDOW_SEC, time]. Samples MUST be sorted by match_time.
 *
 * Linear scan from the start of the array — O(n) per call. Fine at per-map
 * event counts; switch to the bisect approach used in rotation-death
 * detection if this ever runs hot.
 */
export function samplePositionsAt(
  time: number,
  samples: SpatialPositionSample[]
): Map<string, SpatialPositionSample> {
  const windowStart = time - POSITION_WINDOW_SEC;
  const best = new Map<string, { sample: SpatialPositionSample; dt: number }>();

  for (const sample of samples) {
    if (sample.match_time < windowStart) continue;
    if (sample.match_time > time) break;

    const key = `${sample.playerName}::${sample.playerTeam}`;
    const dt = time - sample.match_time;
    const existing = best.get(key);
    if (!existing || dt < existing.dt) {
      best.set(key, { sample, dt });
    }
  }

  return new Map(Array.from(best, ([key, value]) => [key, value.sample]));
}

export function computeIsolationDeathPercentage(
  kills: CoordKill[],
  samples: SpatialPositionSample[],
  playerName: string
): number | null {
  const deaths = kills.filter((k) => k.victim_name === playerName);

  let evaluated = 0;
  let isolated = 0;

  for (const death of deaths) {
    if (
      death.victim_x == null ||
      death.victim_y == null ||
      death.victim_z == null
    ) {
      continue;
    }

    const positions = samplePositionsAt(death.match_time, samples);
    const teammates = Array.from(positions.values()).filter(
      (p) => p.playerTeam === death.victim_team && p.playerName !== playerName
    );
    if (teammates.length === 0) continue;

    evaluated++;
    const nearest = Math.min(
      ...teammates.map((p) =>
        distance3d(
          p.x,
          p.y,
          p.z,
          death.victim_x!,
          death.victim_y!,
          death.victim_z!
        )
      )
    );
    if (nearest > ISOLATION_RADIUS) isolated++;
  }

  if (evaluated < MIN_SAMPLES || evaluated / deaths.length < MIN_COVERAGE) {
    return null;
  }

  return round((isolated / evaluated) * 100);
}

export function computeAverageFightStartSpread(
  fightStarts: number[],
  samples: SpatialPositionSample[],
  playerName: string
): number | null {
  const perFight: number[] = [];

  for (const start of fightStarts) {
    const positions = samplePositionsAt(start, samples);
    const me = Array.from(positions.values()).find(
      (p) => p.playerName === playerName
    );
    if (!me) continue;

    const teammates = Array.from(positions.values()).filter(
      (p) => p.playerTeam === me.playerTeam && p.playerName !== playerName
    );
    if (teammates.length < 2) continue;

    const mean =
      teammates.reduce(
        (acc, p) => acc + distance3d(p.x, p.y, p.z, me.x, me.y, me.z),
        0
      ) / teammates.length;
    perFight.push(mean);
  }

  if (
    perFight.length < MIN_SAMPLES ||
    perFight.length / fightStarts.length < MIN_COVERAGE
  ) {
    return null;
  }

  return round(perFight.reduce((acc, v) => acc + v, 0) / perFight.length);
}

export type SpatialStats = {
  averageEngagementDistance: number | null;
  highGroundKillPercentage: number | null;
  isolationDeathPercentage: number | null;
  averageFightStartSpread: number | null;
};

function pushSample(
  arr: SpatialPositionSample[],
  matchTime: number,
  playerName: string,
  playerTeam: string,
  x: number | null,
  y: number | null,
  z: number | null
) {
  if (x != null && y != null && z != null) {
    arr.push({ match_time: matchTime, playerName, playerTeam, x, y, z });
  }
}

export async function getSpatialStatsForMapData(
  mapDataId: number,
  playerName: string
): Promise<SpatialStats> {
  const [kills, mercyRezzes, damage, healing, ability1, ability2] =
    await Promise.all([
      prisma.kill.findMany({ where: { MapDataId: mapDataId } }),
      prisma.mercyRez.findMany({ where: { MapDataId: mapDataId } }),
      prisma.damage.findMany({
        where: { MapDataId: mapDataId },
        select: {
          match_time: true,
          attacker_name: true,
          attacker_team: true,
          attacker_x: true,
          attacker_y: true,
          attacker_z: true,
          victim_name: true,
          victim_team: true,
          victim_x: true,
          victim_y: true,
          victim_z: true,
        },
      }),
      prisma.healing.findMany({
        where: { MapDataId: mapDataId },
        select: {
          match_time: true,
          healer_name: true,
          healer_team: true,
          healer_x: true,
          healer_y: true,
          healer_z: true,
          healee_name: true,
          healee_team: true,
          healee_x: true,
          healee_y: true,
          healee_z: true,
        },
      }),
      prisma.ability1Used.findMany({
        where: { MapDataId: mapDataId },
        select: {
          match_time: true,
          player_name: true,
          player_team: true,
          player_x: true,
          player_y: true,
          player_z: true,
        },
      }),
      prisma.ability2Used.findMany({
        where: { MapDataId: mapDataId },
        select: {
          match_time: true,
          player_name: true,
          player_team: true,
          player_x: true,
          player_y: true,
          player_z: true,
        },
      }),
    ]);

  const samples: SpatialPositionSample[] = [];
  for (const k of kills) {
    pushSample(
      samples,
      k.match_time,
      k.attacker_name,
      k.attacker_team,
      k.attacker_x,
      k.attacker_y,
      k.attacker_z
    );
    pushSample(
      samples,
      k.match_time,
      k.victim_name,
      k.victim_team,
      k.victim_x,
      k.victim_y,
      k.victim_z
    );
  }
  for (const d of damage) {
    pushSample(
      samples,
      d.match_time,
      d.attacker_name,
      d.attacker_team,
      d.attacker_x,
      d.attacker_y,
      d.attacker_z
    );
    pushSample(
      samples,
      d.match_time,
      d.victim_name,
      d.victim_team,
      d.victim_x,
      d.victim_y,
      d.victim_z
    );
  }
  for (const h of healing) {
    pushSample(
      samples,
      h.match_time,
      h.healer_name,
      h.healer_team,
      h.healer_x,
      h.healer_y,
      h.healer_z
    );
    pushSample(
      samples,
      h.match_time,
      h.healee_name,
      h.healee_team,
      h.healee_x,
      h.healee_y,
      h.healee_z
    );
  }
  for (const a of ability1) {
    pushSample(
      samples,
      a.match_time,
      a.player_name,
      a.player_team,
      a.player_x,
      a.player_y,
      a.player_z
    );
  }
  for (const a of ability2) {
    pushSample(
      samples,
      a.match_time,
      a.player_name,
      a.player_team,
      a.player_x,
      a.player_y,
      a.player_z
    );
  }
  samples.sort((a, b) => a.match_time - b.match_time);

  const fightEvents = [...kills, ...mercyRezzes.map(mercyRezToKillEvent)].sort(
    (a, b) => a.match_time - b.match_time
  );
  const fightStarts = groupEventsIntoFights(fightEvents).map((f) => f.start);

  return {
    averageEngagementDistance: computeAverageEngagementDistance(
      kills,
      playerName
    ),
    highGroundKillPercentage: computeHighGroundKillPercentage(
      kills,
      playerName
    ),
    isolationDeathPercentage: computeIsolationDeathPercentage(
      kills,
      samples,
      playerName
    ),
    averageFightStartSpread: computeAverageFightStartSpread(
      fightStarts,
      samples,
      playerName
    ),
  };
}
