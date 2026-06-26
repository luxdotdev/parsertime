import prismaMock from "@/lib/__mocks__/prisma";
import {
  getOverwatchPatches,
  upsertScrapedPatches,
} from "@/data/overwatch/patches-service";
import type { ParsedPatch } from "@/lib/overwatch/patch-scraper";
import { expect, test, vi } from "vitest";

vi.mock("@/lib/prisma", async () => {
  const actual = await import("@/lib/__mocks__/prisma");
  return { default: actual.default };
});

const parsed: ParsedPatch = {
  date: "2026-04-14",
  type: "SEASON",
  name: "Season 2: Summit",
  rawTitle: "Overwatch Retail Patch Notes - April 14, 2026",
  sourceUrl: "https://example.test/live",
  bodyExcerpt: "Season 2: Summit Patch Notes",
  needsReview: false,
};

test("upserts scraped patches keyed by date and skips MANUAL rows", async () => {
  // One existing MANUAL row that must be left untouched.
  prismaMock.overwatchPatch.findUnique.mockResolvedValue({
    source: "MANUAL",
  } as never);

  const result = await upsertScrapedPatches([parsed]);

  expect(prismaMock.overwatchPatch.upsert).not.toHaveBeenCalled();
  expect(result).toEqual({ inserted: 0, updated: 0, skipped: 1 });
});

test("upserts a new scraped patch", async () => {
  prismaMock.overwatchPatch.findUnique.mockResolvedValue(null);
  prismaMock.overwatchPatch.upsert.mockResolvedValue({} as never);

  const result = await upsertScrapedPatches([parsed]);

  expect(prismaMock.overwatchPatch.upsert).toHaveBeenCalledOnce();
  const arg = prismaMock.overwatchPatch.upsert.mock.calls[0][0];
  expect(arg.where).toEqual({ date: new Date("2026-04-14") });
  expect(arg.create.type).toBe("SEASON");
  expect(arg.create.source).toBe("SCRAPED");
  expect(result).toEqual({ inserted: 1, updated: 0, skipped: 0 });
});

test("maps DB rows to the string view model", async () => {
  prismaMock.overwatchPatch.findMany.mockResolvedValue([
    { date: new Date("2026-04-14"), type: "MID_SEASON", name: "X" },
  ] as never);

  const patches = await getOverwatchPatches();

  expect(patches).toEqual([
    { date: "2026-04-14", type: "mid-season", name: "X" },
  ]);
});
