import "server-only";

import prisma from "@/lib/prisma";
import type { UsageEvent, UsageSource } from "@prisma/client";
import { Context, Data, Effect, Layer, ManagedRuntime, Schedule } from "effect";
import { resolveUsageEnv } from "./env";

class UsageTrackError extends Data.TaggedError("UsageTrackError")<{
  cause: unknown;
}> {}

export type TrackArgs = {
  name: string;
  source?: UsageSource; // defaults to SERVER
  userId?: string | null;
  teamId?: number | null;
  path?: string | null;
  sessionId?: string | null;
  props?: Record<string, unknown> | null;
};

export type Service = {
  track(args: TrackArgs): Effect.Effect<UsageEvent, never>;
};

export class EventService extends Context.Tag("@app/usage/EventService")<
  EventService,
  Service
>() {}

function createService(): Effect.Effect<Service, never> {
  const service: Service = {
    track: (args: TrackArgs) =>
      Effect.tryPromise({
        try: () =>
          prisma.usageEvent.create({
            data: {
              name: args.name,
              source: args.source ?? "SERVER",
              environment: resolveUsageEnv(),
              userId: args.userId ?? null,
              teamId: args.teamId ?? null,
              path: args.path ?? null,
              sessionId: args.sessionId ?? null,
              props: (args.props ?? undefined) as never,
            },
          }),
        catch: (error) => new UsageTrackError({ cause: error }),
      }).pipe(
        Effect.retry(
          Schedule.exponential(500).pipe(Schedule.compose(Schedule.recurs(2)))
        ),
        Effect.withSpan("usage.track", { attributes: { name: args.name } }),
        // Capture must never surface to the caller. Swallow failures so a DB
        // hiccup can't break the originating request or page.
        Effect.catchAll((error) =>
          Effect.logError(
            `usage.track failed for ${args.name}: ${String(error)}`
          ).pipe(Effect.as(null as unknown as UsageEvent))
        )
      ),
  };
  return Effect.succeed(service);
}

export const layer = () => Layer.effect(EventService, createService());
const usageRuntime = ManagedRuntime.make(layer());

/**
 * Fire-and-forget usage tracking. Returns a promise but callers should NOT
 * await it on the request hot path — call `void usage.track(...)`.
 */
export const usage = {
  track: (args: TrackArgs): Promise<void> =>
    usageRuntime
      .runPromise(
        EventService.pipe(Effect.flatMap((svc) => svc.track(args)))
      )
      .then(() => undefined)
      .catch(() => undefined),
} as const;
