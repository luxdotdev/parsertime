import prismaMock from "@/lib/__mocks__/prisma";
import { Effect } from "effect";
import { beforeEach, expect, test, vi } from "vitest";

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

const now = new Date();

const fakeUser = {
  id: "user-1",
  email: "player@dsg.gg",
  name: "Player",
  emailVerified: null,
  image: null,
  createdAt: now,
  updatedAt: now,
  role: "USER",
  billingPlan: "FREE",
} as unknown as Awaited<ReturnType<typeof prismaMock.user.findFirst>>;

beforeEach(() => {
  vi.clearAllMocks();
});

test("returns true when the user belongs to the team", async () => {
  prismaMock.user.findFirst.mockResolvedValue(fakeUser);
  prismaMock.team.findFirst.mockResolvedValue({ id: 345 } as never);

  const { make } = await import("@/data/user/service");
  const service = await Effect.runPromise(make);

  const result = await Effect.runPromise(
    service.isMemberOfTeam("player@dsg.gg", 345)
  );

  expect(result).toBe(true);
  expect(prismaMock.team.findFirst).toHaveBeenCalledWith({
    where: {
      id: 345,
      OR: [
        { ownerId: "user-1" },
        { users: { some: { id: "user-1" } } },
      ],
    },
    select: { id: true },
  });
});

test("returns false when the user is not on the team", async () => {
  prismaMock.user.findFirst.mockResolvedValue(fakeUser);
  prismaMock.team.findFirst.mockResolvedValue(null);

  const { make } = await import("@/data/user/service");
  const service = await Effect.runPromise(make);

  const result = await Effect.runPromise(
    service.isMemberOfTeam("player@dsg.gg", 345)
  );

  expect(result).toBe(false);
});

test("returns false when there is no user (undefined email)", async () => {
  const { make } = await import("@/data/user/service");
  const service = await Effect.runPromise(make);

  const result = await Effect.runPromise(
    service.isMemberOfTeam(undefined, 345)
  );

  expect(result).toBe(false);
  expect(prismaMock.team.findFirst).not.toHaveBeenCalled();
});
