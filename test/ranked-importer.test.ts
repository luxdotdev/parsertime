import { buildMatchCreatePayloads } from "@/lib/ranked/importer";
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
