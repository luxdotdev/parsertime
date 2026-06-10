import { round } from "@/lib/utils";

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

export type PositionSample = {
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
