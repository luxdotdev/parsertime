import { heroRoleMapping } from "@/types/heroes";
import { mapNameToMapTypeMapping } from "@/types/map";

export type MatchHeroInput = { hero: string; percentage: number };
export type MatchInput = {
  map: string;
  result: "win" | "loss" | "draw";
  groupSize: number;
  playedAt: string;
  heroes: MatchHeroInput[];
};
export type ActionResult = { success: boolean; error?: string };

const HERO_NAMES = Object.keys(heroRoleMapping);

export function validateMatchInput(
  match: MatchInput,
  index: number
): string | null {
  if (!(match.map in mapNameToMapTypeMapping)) {
    return `Match ${index + 1}: Invalid map "${match.map}"`;
  }
  if (!["win", "loss", "draw"].includes(match.result)) {
    return `Match ${index + 1}: Invalid result`;
  }
  if (match.groupSize < 1 || match.groupSize > 5) {
    return `Match ${index + 1}: Group size must be 1-5`;
  }
  if (match.heroes.length === 0) {
    return `Match ${index + 1}: At least one hero required`;
  }
  const total = match.heroes.reduce((sum, h) => sum + h.percentage, 0);
  if (total !== 100) {
    return `Match ${index + 1}: Hero percentages must sum to 100 (got ${total})`;
  }
  for (const hero of match.heroes) {
    if (!HERO_NAMES.includes(hero.hero)) {
      return `Match ${index + 1}: Invalid hero "${hero.hero}"`;
    }
    if (hero.percentage < 1 || hero.percentage > 100) {
      return `Match ${index + 1}: Hero percentage must be 1-100`;
    }
  }
  return null;
}
