/**
 * Shared pure functions and types for ult analysis, used by both
 * scrim/overview-service and team/ult-service.
 */
import type { SubroleName } from "@/types/heroes";
import {
  SUBROLE_DISPLAY_NAMES,
  SUBROLE_ORDER,
  subroleHeroMapping,
} from "@/types/heroes";

export type SubroleUltTiming = {
  subrole: string;
  count: number;
  initiation: number;
  midfight: number;
  late: number;
};

export type PlayerUltSummary = {
  heroCountMap: Map<string, number>;
  totalCount: number;
};

export type SubroleCandidate = {
  playerName: string;
  primaryHero: string;
  possibleSubroles: SubroleName[];
  ultCount: number;
};

export type PlayerUltComparison = {
  subrole: string;
  ourPlayerName: string;
  ourHero: string;
  ourUltCount: number;
  opponentPlayerName: string;
  opponentHero: string;
  opponentUltCount: number;
};

function heroSubroles(hero: string): SubroleName[] {
  const result: SubroleName[] = [];
  for (const subrole of SUBROLE_ORDER) {
    if ((subroleHeroMapping[subrole] as string[]).includes(hero)) {
      result.push(subrole);
    }
  }
  return result;
}

function primaryHeroForPlayerSummary(entry: PlayerUltSummary): string {
  let bestHero = "";
  let bestCount = 0;
  for (const [hero, count] of entry.heroCountMap) {
    if (count > bestCount) {
      bestCount = count;
      bestHero = hero;
    }
  }
  return bestHero;
}

/**
 * Assigns each player to a unique subrole slot. Players whose hero fits
 * fewer subroles are assigned first so they don't lose their only option
 * to a more flexible player. This handles overlap (e.g. Tracer appearing
 * in both HitscanDamage and FlexDamage).
 */
export function assignPlayersToSubroles(
  counts: Map<string, PlayerUltSummary>
): Map<SubroleName, SubroleCandidate> {
  const candidates: SubroleCandidate[] = [];
  for (const [name, entry] of counts) {
    const hero = primaryHeroForPlayerSummary(entry);
    const possible = heroSubroles(hero);
    if (possible.length > 0) {
      candidates.push({
        playerName: name,
        primaryHero: hero,
        possibleSubroles: possible,
        ultCount: entry.totalCount,
      });
    }
  }

  candidates.sort(
    (a, b) =>
      a.possibleSubroles.length - b.possibleSubroles.length ||
      b.ultCount - a.ultCount
  );

  const assigned = new Map<SubroleName, SubroleCandidate>();
  const usedPlayers = new Set<string>();

  for (const candidate of candidates) {
    if (usedPlayers.has(candidate.playerName)) continue;
    for (const subrole of candidate.possibleSubroles) {
      if (!assigned.has(subrole)) {
        assigned.set(subrole, candidate);
        usedPlayers.add(candidate.playerName);
        break;
      }
    }
  }

  // Second pass: try to place any remaining unassigned players by checking
  // if the current occupant of a slot could move to an alternative slot.
  for (const candidate of candidates) {
    if (usedPlayers.has(candidate.playerName)) continue;
    for (const subrole of candidate.possibleSubroles) {
      const occupant = assigned.get(subrole);
      if (!occupant) {
        assigned.set(subrole, candidate);
        usedPlayers.add(candidate.playerName);
        break;
      }
      const alternativeForOccupant = occupant.possibleSubroles.find(
        (alt) => alt !== subrole && !assigned.has(alt)
      );
      if (alternativeForOccupant) {
        assigned.set(alternativeForOccupant, occupant);
        assigned.set(subrole, candidate);
        usedPlayers.add(candidate.playerName);
        break;
      }
    }
  }

  return assigned;
}

export function buildPlayerUltComparisons(
  ourPlayerUltCounts: Map<string, PlayerUltSummary>,
  oppPlayerUltCounts: Map<string, PlayerUltSummary>
): PlayerUltComparison[] {
  const ourBySubrole = assignPlayersToSubroles(ourPlayerUltCounts);
  const oppBySubrole = assignPlayersToSubroles(oppPlayerUltCounts);

  const comparisons: PlayerUltComparison[] = [];
  for (const subrole of SUBROLE_ORDER) {
    const ours = ourBySubrole.get(subrole);
    const theirs = oppBySubrole.get(subrole);
    if (!ours && !theirs) continue;

    comparisons.push({
      subrole: SUBROLE_DISPLAY_NAMES[subrole],
      ourPlayerName: ours?.playerName ?? "",
      ourHero: ours?.primaryHero ?? "",
      ourUltCount: ours?.ultCount ?? 0,
      opponentPlayerName: theirs?.playerName ?? "",
      opponentHero: theirs?.primaryHero ?? "",
      opponentUltCount: theirs?.ultCount ?? 0,
    });
  }

  return comparisons;
}
