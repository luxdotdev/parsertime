"use server";

import { RankedService } from "@/data/ranked";
import { AppRuntime } from "@/data/runtime";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getHeroRole } from "@/types/heroes";
import { mapNameToMapTypeMapping, type MapName } from "@/types/map";
import { Effect } from "effect";
import { revalidatePath } from "next/cache";
import {
  validateMatchInput,
  type ActionResult,
  type MatchInput,
} from "./validation";

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

export async function deleteRankedMatch(
  matchId: string
): Promise<ActionResult> {
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
