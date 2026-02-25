import { heroRoleMapping, type HeroName } from "@/types/heroes";
import type { RosterPlayerForLabeling } from "@/data/data-labeling-dto";
import type { RosterRole } from "@prisma/client";

export const HERO_ROLE_TO_ROSTER_ROLES: Record<string, RosterRole[]> = {
  Tank: ["Tank", "Flex"],
  Damage: ["DPS", "Flex"],
  Support: ["Support", "Flex"],
};

export function getEligiblePlayers(
  heroName: string,
  roster: RosterPlayerForLabeling[],
  currentPlayer?: string
): RosterPlayerForLabeling[] {
  const heroRole = heroRoleMapping[heroName as HeroName];
  if (!heroRole) return roster;

  const eligibleRoles = HERO_ROLE_TO_ROSTER_ROLES[heroRole] ?? [];
  const filtered = roster.filter((p) => eligibleRoles.includes(p.role));

  if (filtered.length === 0) return roster;

  if (currentPlayer && !filtered.some((p) => p.displayName === currentPlayer)) {
    const currentRosterEntry = roster.find((p) => p.displayName === currentPlayer);
    if (currentRosterEntry) return [...filtered, currentRosterEntry];
  }

  return filtered;
}

export function autoSuggestAssignments(
  heroes: string[],
  roster: RosterPlayerForLabeling[],
  existingAssignments: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  const usedPlayers = new Set<string>();

  for (const hero of heroes) {
    if (existingAssignments[hero]) {
      result[hero] = existingAssignments[hero];
      usedPlayers.add(existingAssignments[hero]);
    }
  }

  for (const hero of heroes) {
    if (result[hero]) continue;

    const heroRole = heroRoleMapping[hero as HeroName];
    if (!heroRole) continue;

    const eligibleRoles = HERO_ROLE_TO_ROSTER_ROLES[heroRole] ?? [];
    const candidates = roster.filter(
      (p) => eligibleRoles.includes(p.role) && !usedPlayers.has(p.displayName)
    );

    if (candidates.length === 1) {
      result[hero] = candidates[0].displayName;
      usedPlayers.add(candidates[0].displayName);
    }
  }

  return result;
}
