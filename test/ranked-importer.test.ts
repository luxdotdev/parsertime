import { buildMatchCreatePayloads, isValidImportMatch } from "@/lib/ranked/importer";
import type { RankedExportBundle } from "@/lib/ranked/export-schema";
import { expect, test } from "vitest";

const bundle: RankedExportBundle = {
  version: 1,
  user: { email: "a@b.com", oauthAccounts: [] },
  matches: [
    {
      sourceId: "old-1",
      map: "Ilios",
      mapType: "Control",
      result: "win",
      groupSize: 2,
      playedAt: "2026-01-01T00:00:00.000Z",
      heroes: [{ hero: "Ana", role: "Support", percentage: 100 }],
    },
  ],
};

test("buildMatchCreatePayloads maps bundle matches to prisma create inputs", () => {
  const payloads = buildMatchCreatePayloads("user-1", bundle, new Set());
  expect(payloads).toHaveLength(1);
  expect(payloads[0].userId).toBe("user-1");
  expect(payloads[0].sourceId).toBe("old-1");
  expect(payloads[0].playedAt instanceof Date).toBe(true);
  expect(payloads[0].heroes.create).toHaveLength(1);
});

test("buildMatchCreatePayloads skips already-imported sourceIds", () => {
  const payloads = buildMatchCreatePayloads("user-1", bundle, new Set(["old-1"]));
  expect(payloads).toHaveLength(0);
});

// isValidImportMatch tests

const validMatch: RankedExportBundle["matches"][number] = {
  sourceId: "m-1",
  map: "Ilios",
  mapType: "Control",
  result: "win",
  groupSize: 1,
  playedAt: "2026-01-01T00:00:00.000Z",
  heroes: [{ hero: "Ana", role: "Support", percentage: 100 }],
};

test("isValidImportMatch returns true for a valid match", () => {
  expect(isValidImportMatch(validMatch)).toBe(true);
});

test("isValidImportMatch returns false for unknown map", () => {
  expect(isValidImportMatch({ ...validMatch, map: "NotARealMap" })).toBe(false);
});

test("isValidImportMatch returns false for unknown hero", () => {
  expect(
    isValidImportMatch({
      ...validMatch,
      heroes: [{ hero: "NotAHero", role: "Support", percentage: 100 }],
    })
  ).toBe(false);
});

test("isValidImportMatch returns false when hero percentages do not sum to 100", () => {
  expect(
    isValidImportMatch({
      ...validMatch,
      heroes: [
        { hero: "Ana", role: "Support", percentage: 60 },
        { hero: "Mercy", role: "Support", percentage: 30 },
      ],
    })
  ).toBe(false);
});

test("isValidImportMatch returns false for non-integer percentage", () => {
  expect(
    isValidImportMatch({
      ...validMatch,
      heroes: [{ hero: "Ana", role: "Support", percentage: 99.5 }],
    })
  ).toBe(false);
});

test("isValidImportMatch returns false for invalid result value", () => {
  expect(
    isValidImportMatch({
      ...validMatch,
      result: "forfeit" as "win" | "loss" | "draw",
    })
  ).toBe(false);
});
