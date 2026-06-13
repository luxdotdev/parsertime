import type { FsrStatColumn, FsrStatConfig } from "@/lib/fsr/types";
import { FaceitRole } from "@/generated/prisma/client";

const ROLE_STAT_CONFIGS: Record<FaceitRole, FsrStatConfig[]> = {
  [FaceitRole.DAMAGE]: [
    { column: "eliminations", weight: 0.3 },
    { column: "finalBlows", weight: 0.2 },
    { column: "deaths", weight: 0.2, invert: true },
    { column: "damageDealt", weight: 0.2 },
    { column: "soloKills", weight: 0.1 },
  ],
  [FaceitRole.TANK]: [
    { column: "eliminations", weight: 0.2 },
    { column: "deaths", weight: 0.3, invert: true },
    { column: "damageDealt", weight: 0.12 },
    { column: "damageMitigated", weight: 0.15 },
    { column: "finalBlows", weight: 0.08 },
    { column: "soloKills", weight: 0.15 },
  ],
  [FaceitRole.SUPPORT]: [
    { column: "healingDone", weight: 0.35 },
    { column: "deaths", weight: 0.25, invert: true },
    { column: "damageDealt", weight: 0.14 },
    { column: "eliminations", weight: 0.1 },
    { column: "assists", weight: 0.05 },
    { column: "finalBlows", weight: 0.05 },
    { column: "soloKills", weight: 0.06 },
  ],
};

export function getFsrStatConfigs(
  role: FaceitRole,
  customWeights?: Partial<Record<FsrStatColumn, number>>
): FsrStatConfig[] {
  const base = ROLE_STAT_CONFIGS[role];
  if (!customWeights) return base;
  return base.map((c) => ({
    ...c,
    weight: customWeights[c.column] ?? c.weight,
  }));
}

/** Every stat column referenced across all role configs (for the SQL aggregate). */
export const ALL_FSR_STAT_COLUMNS: FsrStatColumn[] = [
  "eliminations",
  "finalBlows",
  "deaths",
  "damageDealt",
  "healingDone",
  "damageMitigated",
  "soloKills",
  "assists",
  "objectiveTime",
];
