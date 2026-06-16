import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import type { AppSettings, Team, User } from "@/generated/prisma/client";
import { $Enums } from "@/generated/prisma/browser";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { UserQueryError } from "./errors";
import {
  getAppSettingsDuration,
  getAppSettingsErrorTotal,
  getAppSettingsSuccessTotal,
  getTeamsDuration,
  getTeamsErrorTotal,
  getTeamsSuccessTotal,
  getUserDuration,
  getUserErrorTotal,
  getUserSuccessTotal,
  userCacheRequestTotal,
  userCacheMissTotal,
  isMemberOfTeamSuccessTotal,
  isMemberOfTeamErrorTotal,
  isMemberOfTeamDuration,
} from "./metrics";

export type UserServiceInterface = {
  readonly getUser: (
    email: string | undefined
  ) => Effect.Effect<User | null, UserQueryError>;

  readonly getTeamsWithPerms: (
    email: string | undefined
  ) => Effect.Effect<Team[], UserQueryError>;

  readonly getAppSettings: (
    email: string | undefined
  ) => Effect.Effect<AppSettings | null, UserQueryError>;

  readonly isMemberOfTeam: (
    email: string | undefined,
    teamId: number
  ) => Effect.Effect<boolean, UserQueryError>;
};

export class UserService extends Context.Tag("@app/data/user/UserService")<
  UserService,
  UserServiceInterface
>() {}

export const make: Effect.Effect<UserServiceInterface> = Effect.gen(
  function* () {
    function getUser(
      email: string | undefined
    ): Effect.Effect<User | null, UserQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        email: email ?? "undefined",
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("email", email ?? "undefined");
        if (!email) {
          wideEvent.outcome = "success";
          wideEvent.found = false;
          yield* Metric.increment(getUserSuccessTotal);
          return null;
        }

        const user = yield* Effect.tryPromise({
          try: () => prisma.user.findFirst({ where: { email } }),
          catch: (error) =>
            new UserQueryError({
              operation: "find user by email",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("user.findByEmail", {
            attributes: { email },
          })
        );

        wideEvent.found = !!user;
        wideEvent.outcome = "success";
        yield* Metric.increment(getUserSuccessTotal);
        return user;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(getUserErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("user.getUser")
                : Effect.logInfo("user.getUser");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(getUserDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("user.getUser")
      );
    }

    function getTeamsWithPerms(
      email: string | undefined
    ): Effect.Effect<Team[], UserQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        email: email ?? "undefined",
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("email", email ?? "undefined");
        const user = yield* getUser(email);
        if (!user) {
          wideEvent.team_count = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(getTeamsSuccessTotal);
          return [];
        }

        const teams = yield* Effect.tryPromise({
          try: () =>
            prisma.team.findMany({
              where: {
                OR: [
                  { ownerId: user.id },
                  {
                    users: {
                      some: {
                        id: user.id,
                        role: {
                          in: [$Enums.UserRole.MANAGER, $Enums.UserRole.ADMIN],
                        },
                      },
                    },
                  },
                  { managers: { some: { userId: user.id } } },
                ],
                id: { not: 0 },
              },
            }),
          catch: (error) =>
            new UserQueryError({
              operation: "find teams with permissions",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("user.findTeamsWithPerms", {
            attributes: { userId: user.id },
          })
        );

        wideEvent.team_count = teams.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(getTeamsSuccessTotal);
        return teams;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(getTeamsErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("user.getTeamsWithPerms")
                : Effect.logInfo("user.getTeamsWithPerms");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(getTeamsDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("user.getTeamsWithPerms")
      );
    }

    function getAppSettings(
      email: string | undefined
    ): Effect.Effect<AppSettings | null, UserQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        email: email ?? "undefined",
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("email", email ?? "undefined");
        const user = yield* getUser(email);
        if (!user) {
          wideEvent.outcome = "success";
          wideEvent.found = false;
          yield* Metric.increment(getAppSettingsSuccessTotal);
          return null;
        }

        const appSettings = yield* Effect.tryPromise({
          try: () =>
            prisma.appSettings.findUnique({
              where: { userId: user.id },
            }),
          catch: (error) =>
            new UserQueryError({
              operation: "find app settings",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("user.findAppSettings", {
            attributes: { userId: user.id },
          })
        );

        wideEvent.found = !!appSettings;
        wideEvent.outcome = "success";
        yield* Metric.increment(getAppSettingsSuccessTotal);
        return appSettings;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(getAppSettingsErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("user.getAppSettings")
                : Effect.logInfo("user.getAppSettings");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(getAppSettingsDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("user.getAppSettings")
      );
    }

    function isMemberOfTeam(
      email: string | undefined,
      teamId: number
    ): Effect.Effect<boolean, UserQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        email: email ?? "undefined",
        team_id: teamId,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("email", email ?? "undefined");
        yield* Effect.annotateCurrentSpan("teamId", teamId);
        const user = yield* getUser(email);
        if (!user) {
          wideEvent.outcome = "success";
          wideEvent.is_member = false;
          yield* Metric.increment(isMemberOfTeamSuccessTotal);
          return false;
        }

        const team = yield* Effect.tryPromise({
          try: () =>
            prisma.team.findFirst({
              where: {
                id: teamId,
                OR: [
                  { ownerId: user.id },
                  { users: { some: { id: user.id } } },
                ],
              },
              select: { id: true },
            }),
          catch: (error) =>
            new UserQueryError({
              operation: "check team membership",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("user.findTeamMembership", {
            attributes: { userId: user.id, teamId },
          })
        );

        const isMember = team !== null;
        wideEvent.outcome = "success";
        wideEvent.is_member = isMember;
        yield* Metric.increment(isMemberOfTeamSuccessTotal);
        return isMember;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(isMemberOfTeamErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("user.isMemberOfTeam")
                : Effect.logInfo("user.isMemberOfTeam");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(isMemberOfTeamDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("user.isMemberOfTeam")
      );
    }

    const getUserCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (key: string) =>
        getUser(key === "__undefined__" ? undefined : key).pipe(
          Effect.tap(() => Metric.increment(userCacheMissTotal))
        ),
    });

    const getTeamsWithPermsCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (key: string) =>
        getTeamsWithPerms(key === "__undefined__" ? undefined : key).pipe(
          Effect.tap(() => Metric.increment(userCacheMissTotal))
        ),
    });

    const getAppSettingsCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (key: string) =>
        getAppSettings(key === "__undefined__" ? undefined : key).pipe(
          Effect.tap(() => Metric.increment(userCacheMissTotal))
        ),
    });

    const isMemberOfTeamCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (key: string) => {
        const sep = key.lastIndexOf("::");
        const emailKey = key.slice(0, sep);
        const teamId = Number(key.slice(sep + 2));
        return isMemberOfTeam(
          emailKey === "__undefined__" ? undefined : emailKey,
          teamId
        ).pipe(Effect.tap(() => Metric.increment(userCacheMissTotal)));
      },
    });

    return {
      getUser: (email: string | undefined) =>
        getUserCache
          .get(email ?? "__undefined__")
          .pipe(Effect.tap(() => Metric.increment(userCacheRequestTotal))),
      getTeamsWithPerms: (email: string | undefined) =>
        getTeamsWithPermsCache
          .get(email ?? "__undefined__")
          .pipe(Effect.tap(() => Metric.increment(userCacheRequestTotal))),
      getAppSettings: (email: string | undefined) =>
        getAppSettingsCache
          .get(email ?? "__undefined__")
          .pipe(Effect.tap(() => Metric.increment(userCacheRequestTotal))),
      isMemberOfTeam: (email: string | undefined, teamId: number) =>
        isMemberOfTeamCache
          .get(`${email ?? "__undefined__"}::${teamId}`)
          .pipe(Effect.tap(() => Metric.increment(userCacheRequestTotal))),
    } satisfies UserServiceInterface;
  }
);

export const UserServiceLive = Layer.effect(UserService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
