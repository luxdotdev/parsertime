import prismaMock from "@/lib/__mocks__/prisma";
import { Effect } from "effect";
import { expect, test, vi } from "vitest";

vi.mock("@/lib/prisma", async () => {
  const actual = await import("@/lib/__mocks__/prisma");
  return {
    default: actual.default,
  };
});

vi.mock("@/instrumentation", async () => {
  const { Layer } = await import("effect");
  return {
    EffectObservabilityLive: Layer.empty,
  };
});

test("hero stats resolve MapData IDs from scrim IDs", async () => {
  const now = new Date();
  prismaMock.mapData.findMany.mockResolvedValue([
    {
      id: 101,
      scrimId: 1,
      userId: "user-1",
      createdAt: now,
      updatedAt: now,
      mapId: 11,
    },
    {
      id: 202,
      scrimId: 2,
      userId: "user-1",
      createdAt: now,
      updatedAt: now,
      mapId: 22,
    },
  ]);
  prismaMock.$queryRaw.mockResolvedValue([]);

  const { make } = await import("@/data/hero/service");
  const service = await Effect.runPromise(make);

  await Effect.runPromise(service.getAllStatsForHero([1, 2], "Kiriko"));

  expect(prismaMock.mapData.findMany).toHaveBeenCalledWith({
    where: { scrimId: { in: [1, 2] } },
    select: { id: true },
  });
  expect(prismaMock.scrim.findMany).not.toHaveBeenCalled();
});
