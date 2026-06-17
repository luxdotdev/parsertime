import "server-only";

import prisma from "@/lib/prisma";
import type { ParsedPatch } from "@/lib/overwatch/patch-scraper";
import type { OverwatchPatch, PatchType } from "@/types/overwatch-patches";
import type { $Enums } from "@/generated/prisma/client";

export type UpsertResult = {
  inserted: number;
  updated: number;
  skipped: number;
};

const TYPE_TO_VIEW: Record<$Enums.OverwatchPatchType, PatchType> = {
  SEASON: "season",
  MID_SEASON: "mid-season",
  HOTFIX: "hotfix",
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function upsertScrapedPatches(
  patches: ParsedPatch[]
): Promise<UpsertResult> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const patch of patches) {
    const date = new Date(patch.date);
    const existing = await prisma.overwatchPatch.findUnique({
      where: { date },
      select: { source: true },
    });

    // Never overwrite a row a human has corrected.
    if (existing?.source === "MANUAL") {
      skipped += 1;
      continue;
    }

    await prisma.overwatchPatch.upsert({
      where: { date },
      create: {
        date,
        type: patch.type,
        name: patch.name,
        rawTitle: patch.rawTitle,
        sourceUrl: patch.sourceUrl,
        bodyExcerpt: patch.bodyExcerpt,
        source: "SCRAPED",
        needsReview: patch.needsReview,
      },
      update: {
        type: patch.type,
        name: patch.name,
        rawTitle: patch.rawTitle,
        sourceUrl: patch.sourceUrl,
        bodyExcerpt: patch.bodyExcerpt,
        needsReview: patch.needsReview,
      },
    });

    if (existing) updated += 1;
    else inserted += 1;
  }

  return { inserted, updated, skipped };
}

export async function getOverwatchPatches(): Promise<OverwatchPatch[]> {
  const rows = await prisma.overwatchPatch.findMany({
    orderBy: { date: "asc" },
    select: { date: true, type: true, name: true },
  });
  return rows.map((row) => ({
    date: isoDate(row.date),
    type: TYPE_TO_VIEW[row.type],
    name: row.name,
  }));
}
