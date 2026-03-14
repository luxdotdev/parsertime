import type { PlayerStat } from "@prisma/client";

export type TargetStatKey = Extract<
  keyof PlayerStat,
  | "eliminations"
  | "deaths"
  | "hero_damage_dealt"
  | "damage_taken"
  | "damage_blocked"
  | "final_blows"
  | "healing_dealt"
  | "ultimates_earned"
>;

export type RoleName = "Tank" | "Damage" | "Support";

export type TargetStatConfig = {
  key: TargetStatKey;
  displayName: string;
  roles: RoleName[];
  better: "higher" | "lower";
};

export const TARGET_STATS: TargetStatConfig[] = [
  {
    key: "eliminations",
    displayName: "Eliminations/10",
    roles: ["Tank", "Damage", "Support"],
    better: "higher",
  },
  {
    key: "deaths",
    displayName: "Deaths/10",
    roles: ["Tank", "Damage", "Support"],
    better: "lower",
  },
  {
    key: "hero_damage_dealt",
    displayName: "Hero Damage/10",
    roles: ["Tank", "Damage", "Support"],
    better: "higher",
  },
  {
    key: "damage_taken",
    displayName: "Damage Taken/10",
    roles: ["Tank", "Damage", "Support"],
    better: "lower",
  },
  {
    key: "damage_blocked",
    displayName: "Damage Blocked/10",
    roles: ["Tank"],
    better: "higher",
  },
  {
    key: "final_blows",
    displayName: "Final Blows/10",
    roles: ["Damage"],
    better: "higher",
  },
  {
    key: "healing_dealt",
    displayName: "Healing Dealt/10",
    roles: ["Support"],
    better: "higher",
  },
  {
    key: "ultimates_earned",
    displayName: "Ultimates Earned/10",
    roles: ["Tank", "Damage", "Support"],
    better: "higher",
  },
];

export function getStatsForRole(role: RoleName): TargetStatConfig[] {
  return TARGET_STATS.filter((s) => s.roles.includes(role));
}

export function getStatConfig(key: string): TargetStatConfig | undefined {
  return TARGET_STATS.find((s) => s.key === key);
}

export function getDefaultDirection(key: string): "increase" | "decrease" {
  const config = getStatConfig(key);
  if (!config) return "decrease";
  return config.better === "higher" ? "increase" : "decrease";
}
