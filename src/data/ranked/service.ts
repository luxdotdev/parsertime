import prisma from "@/lib/prisma";
import { Context, Effect, Layer } from "effect";
import { RankedQueryError } from "./errors";
import type {
  CreateRankedMatchInput,
  RankedMatchWithHeroes,
} from "./types";

export type RankedServiceInterface = {
  readonly getMatchesForUser: (
    userId: string
  ) => Effect.Effect<RankedMatchWithHeroes[], RankedQueryError>;

  readonly createMatch: (
    userId: string,
    input: CreateRankedMatchInput
  ) => Effect.Effect<void, RankedQueryError>;

  readonly deleteMatch: (
    userId: string,
    matchId: string
  ) => Effect.Effect<void, RankedQueryError>;
};

export class RankedService extends Context.Tag("@app/data/ranked/RankedService")<
  RankedService,
  RankedServiceInterface
>() {}

export const make: Effect.Effect<RankedServiceInterface> = Effect.sync(() => {
  function getMatchesForUser(userId: string) {
    return Effect.tryPromise({
      try: () =>
        prisma.rankedMatch.findMany({
          where: { userId },
          include: { heroes: true },
          orderBy: { playedAt: "desc" },
        }),
      catch: (error) =>
        new RankedQueryError({ cause: error, operation: "getMatchesForUser" }),
    });
  }

  function createMatch(userId: string, input: CreateRankedMatchInput) {
    return Effect.tryPromise({
      try: () =>
        prisma.rankedMatch.create({
          data: {
            userId,
            map: input.map,
            mapType: input.mapType,
            result: input.result,
            groupSize: input.groupSize,
            playedAt: input.playedAt,
            sourceId: input.sourceId ?? null,
            heroes: {
              create: input.heroes.map((h) => ({
                hero: h.hero,
                role: h.role,
                percentage: h.percentage,
              })),
            },
          },
        }),
      catch: (error) =>
        new RankedQueryError({ cause: error, operation: "createMatch" }),
    }).pipe(Effect.asVoid);
  }

  function deleteMatch(userId: string, matchId: string) {
    return Effect.tryPromise({
      try: () =>
        prisma.rankedMatch.deleteMany({ where: { id: matchId, userId } }),
      catch: (error) =>
        new RankedQueryError({ cause: error, operation: "deleteMatch" }),
    }).pipe(Effect.asVoid);
  }

  return {
    getMatchesForUser,
    createMatch,
    deleteMatch,
  } satisfies RankedServiceInterface;
});

export const RankedServiceLive = Layer.effect(RankedService, make);
