import prisma from "@/lib/prisma";
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
): Promise<{ imported: number; skipped: number }> {
  const existing = await prisma.rankedMatch.findMany({
    where: { userId, sourceId: { not: null } },
    select: { sourceId: true },
  });
  const existingSourceIds = new Set(
    existing.map((e) => e.sourceId).filter((s): s is string => s !== null)
  );

  const payloads = buildMatchCreatePayloads(userId, bundle, existingSourceIds);

  await prisma.$transaction(
    payloads.map((p) => prisma.rankedMatch.create({ data: p }))
  );

  return {
    imported: payloads.length,
    skipped: bundle.matches.length - payloads.length,
  };
}
