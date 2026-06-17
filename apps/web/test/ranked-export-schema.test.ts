import { parseRankedBundle } from "@/lib/ranked/export-schema";
import { expect, test } from "vitest";

const valid = {
  version: 1,
  user: {
    email: "a@b.com",
    oauthAccounts: [{ provider: "github", providerAccountId: "123" }],
  },
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

test("parses a valid bundle", () => {
  const result = parseRankedBundle(valid);
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.bundle.matches).toHaveLength(1);
});
test("rejects a bundle with the wrong version", () => {
  expect(parseRankedBundle({ ...valid, version: 99 }).ok).toBe(false);
});
test("rejects a bundle missing user email", () => {
  expect(parseRankedBundle({ ...valid, user: { oauthAccounts: [] } }).ok).toBe(
    false
  );
});
