import { flag, serialize } from "flags/next";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.FLAGS_SECRET = "dGVzdC1zZWNyZXQtdGVzdC1zZWNyZXQtdGVzdC1zZWNyZXQ";

const flagA = flag<boolean>({
  key: "flag-a",
  options: [{ value: true }, { value: false }],
  defaultValue: false,
  decide: () => true,
});
const flagB = flag<boolean>({
  key: "flag-b",
  options: [{ value: true }, { value: false }],
  defaultValue: false,
  decide: () => false,
});
const testGroup = [flagA, flagB] as const;

const requestHeaders = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve({
      get: (name: string) => requestHeaders.get(name) ?? null,
    }),
}));
vi.mock("@/lib/flags-precompute", () => ({
  FLAGS_CODE_HEADER: "x-flags-code",
  pageFlags: testGroup,
}));
vi.mock("@/lib/axiom/server", () => ({
  logger: { warn: vi.fn() },
}));
// flags-helpers also re-exports a live resolver over the real flag module,
// whose import chain reaches Stripe/Prisma env setup — stub it out.
vi.mock("@/lib/flags", () => {
  function stub() {
    return Promise.resolve(false);
  }
  return {
    aiChat: stub,
    coachingCanvas: stub,
    dataLabeling: stub,
    faceitScouting: stub,
    mapComparison: stub,
    newLandingPage: stub,
    overviewCard: stub,
    positionalData: stub,
    queryBuilder: stub,
    scoutingTool: stub,
    simulationTool: stub,
    tempoChart: stub,
    tournament: stub,
    ultimateImpactTool: stub,
  };
});

describe("getFlag", () => {
  beforeEach(() => requestHeaders.clear());

  it("decodes the precomputed value from the request header", async () => {
    const { getFlag } = await import("@/lib/flags-helpers");
    const code = await serialize(testGroup, [true, false]);
    requestHeaders.set("x-flags-code", code);
    await expect(getFlag(flagA)).resolves.toBe(true);
    await expect(getFlag(flagB)).resolves.toBe(false);
  });

  it("falls back to false when the header is missing", async () => {
    const { getFlag } = await import("@/lib/flags-helpers");
    await expect(getFlag(flagA)).resolves.toBe(false);
  });
});
