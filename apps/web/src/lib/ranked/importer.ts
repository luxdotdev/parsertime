import prisma from "@/lib/prisma";
import { mapNameToMapTypeMapping } from "@/types/map";
import { heroRoleMapping } from "@/types/heroes";
import type { RankedExportBundle } from "./export-schema";

export type RankedMatchCreatePayload = {
  userId: string;
  map: string;
  mapType: string;
  result: string;
  groupSize: number;
  playedAt: Date;
  sourceId: string;
  heroes: {
    create: { hero: string; role: string; percentage: number }[];
  };
};

/** Returns true only when the match passes all business validation rules. */
export function isValidImportMatch(
  m: RankedExportBundle["matches"][number]
): boolean {
  if (!(m.map in mapNameToMapTypeMapping)) return false;
  if (!["win", "loss", "draw"].includes(m.result)) return false;

  for (const h of m.heroes) {
    if (!(h.hero in heroRoleMapping)) return false;
    if (!Number.isInteger(h.percentage)) return false;
    if (h.percentage < 1 || h.percentage > 100) return false;
  }

  const total = m.heroes.reduce((sum, h) => sum + h.percentage, 0);
  if (total !== 100) return false;

  return true;
}

export function buildMatchCreatePayloads(
  userId: string,
  bundle: RankedExportBundle,
  existingSourceIds: Set<string>
): RankedMatchCreatePayload[] {
  return bundle.matches
    .filter((m) => !existingSourceIds.has(m.sourceId))
    .map((m) => ({
      userId,
      map: m.map,
      mapType: m.mapType,
      result: m.result,
      groupSize: m.groupSize,
      playedAt: new Date(m.playedAt),
      sourceId: m.sourceId,
      heroes: {
        create: m.heroes.map((h) => ({
          hero: h.hero,
          role: h.role,
          percentage: h.percentage,
        })),
      },
    }));
}

export async function importRankedBundle(
  userId: string,
  bundle: RankedExportBundle
): Promise<{ imported: number; skipped: number; invalid: number }> {
  const validMatches = bundle.matches.filter((m) => isValidImportMatch(m));
  const invalidCount = bundle.matches.length - validMatches.length;

  // Pre-query existing sourceIds to distinguish new vs already-present
  const existing = await prisma.rankedMatch.findMany({
    where: { userId, sourceId: { not: null } },
    select: { sourceId: true },
  });
  const existingSourceIds = new Set(
    existing.map((e) => e.sourceId).filter((s): s is string => s !== null)
  );

  const newMatches = validMatches.filter(
    (m) => !existingSourceIds.has(m.sourceId)
  );
  const skippedCount = validMatches.length - newMatches.length;

  if (newMatches.length > 0) {
    await prisma.$transaction(
      newMatches.map((m) =>
        prisma.rankedMatch.upsert({
          where: { userId_sourceId: { userId, sourceId: m.sourceId } },
          create: {
            userId,
            map: m.map,
            mapType: m.mapType,
            result: m.result,
            groupSize: m.groupSize,
            playedAt: new Date(m.playedAt),
            sourceId: m.sourceId,
            heroes: {
              create: [...m.heroes],
            },
          },
          update: {},
        })
      )
    );
  }

  return {
    imported: newMatches.length,
    skipped: skippedCount,
    invalid: invalidCount,
  };
}
