import type { FsrInsight, FsrRadarAxis, PlayerRoleUsage } from "@/data/faceit/player-types";
import type { FaceitRole } from "@/generated/prisma/client";

export const STRENGTH_Z_THRESHOLD = 0.75;

const RADAR_ORDER = [
  "eliminations", "finalBlows", "deaths", "damageDealt", "healingDone",
  "damageMitigated", "soloKills", "assists", "objectiveTime",
] as const;

type StatZ = Record<string, number>;

/**
 * statZ stores z-scores already oriented so higher = better (the FSR engine
 * inverts deaths at z-score time). So a positive z is always good here.
 */
export function statZToRadar(statZ: StatZ): FsrRadarAxis[] {
  return RADAR_ORDER.map((stat) => ({ stat, z: statZ[stat] ?? 0 }));
}

export function strengthsWeaknesses(statZ: StatZ): {
  strengths: FsrInsight[];
  weaknesses: FsrInsight[];
} {
  const strengths: FsrInsight[] = [];
  const weaknesses: FsrInsight[] = [];
  for (const stat of RADAR_ORDER) {
    const z = statZ[stat] ?? 0;
    if (z >= STRENGTH_Z_THRESHOLD) strengths.push({ stat, z, kind: "strength" });
    else if (z <= -STRENGTH_Z_THRESHOLD) weaknesses.push({ stat, z, kind: "weakness" });
  }
  strengths.sort((a, b) => b.z - a.z);
  weaknesses.sort((a, b) => a.z - b.z);
  return { strengths, weaknesses };
}

export function roleUsage(
  rows: { role: FaceitRole; mapCount: number }[]
): PlayerRoleUsage[] {
  const total = rows.reduce((s, r) => s + r.mapCount, 0);
  return rows
    .map((r) => ({ role: r.role, mapCount: r.mapCount, share: total === 0 ? 0 : r.mapCount / total }))
    .sort((a, b) => b.mapCount - a.mapCount);
}
