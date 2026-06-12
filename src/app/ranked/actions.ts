"use server";

import { RankedService } from "@/data/ranked";
import { AppRuntime } from "@/data/runtime";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getHeroRole, heroRoleMapping } from "@/types/heroes";
import { mapNameToMapTypeMapping, type MapName } from "@/types/map";
import { Effect } from "effect";
import { revalidatePath } from "next/cache";

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

export async function createMatches(
  matches: MatchInput[]
): Promise<ActionResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { success: false, error: "Not authenticated" };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: false, error: "Not authenticated" };

  for (let i = 0; i < matches.length; i++) {
    const error = validateMatchInput(matches[i], i);
    if (error) return { success: false, error };
  }

  for (const match of matches) {
    const mapType = mapNameToMapTypeMapping[match.map as MapName];
    await AppRuntime.runPromise(
      RankedService.pipe(
        Effect.flatMap((svc) =>
          svc.createMatch(user.id, {
            map: match.map,
            mapType: String(mapType),
            result: match.result,
            groupSize: match.groupSize,
            playedAt: new Date(match.playedAt),
            heroes: match.heroes.map((h) => ({
              hero: h.hero,
              role: getHeroRole(h.hero),
              percentage: h.percentage,
            })),
          })
        )
      )
    );
  }

  revalidatePath("/ranked");
  return { success: true };
}

export async function deleteRankedMatch(matchId: string): Promise<ActionResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { success: false, error: "Not authenticated" };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: false, error: "Not authenticated" };

  await AppRuntime.runPromise(
    RankedService.pipe(
      Effect.flatMap((svc) => svc.deleteMatch(user.id, matchId))
    )
  );

  revalidatePath("/ranked");
  return { success: true };
}
