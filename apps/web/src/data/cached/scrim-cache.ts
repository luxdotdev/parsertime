import "server-only";

import { AppRuntime } from "@/data/runtime";
import {
  ScrimOverviewService,
  ScrimPositionalArtifactsService,
  ScrimPositionalStatsService,
  ScrimService,
} from "@/data/scrim";
import { ScrimInitiationService } from "@/data/scrim/initiation-service";
import { scrimTag } from "@/lib/cache-tags";
import { Effect } from "effect";
import { cacheLife, cacheTag } from "next/cache";

// Scrim-level aggregates depend on the full set of maps in the scrim, so unlike
// per-map reads they change when maps are added, removed, or edited. They're
// tagged `scrim:${scrimId}` and invalidated from the scrim mutation routes.

export async function getCachedScrim(scrimId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(scrimTag(scrimId));
  return AppRuntime.runPromise(
    ScrimService.pipe(Effect.flatMap((svc) => svc.getScrim(scrimId)))
  );
}

export async function getCachedScrimOverview(scrimId: number, teamId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(scrimTag(scrimId));
  return AppRuntime.runPromise(
    ScrimOverviewService.pipe(
      Effect.flatMap((svc) => svc.getScrimOverview(scrimId, teamId))
    )
  );
}

export async function getCachedScrimPositionalStats(scrimId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(scrimTag(scrimId));
  return AppRuntime.runPromise(
    ScrimPositionalStatsService.pipe(
      Effect.flatMap((svc) => svc.getScrimPositionalStats(scrimId))
    )
  );
}

export async function getCachedScrimPositionalArtifacts(
  scrimId: number,
  teamId: number
) {
  "use cache";
  cacheLife("max");
  cacheTag(scrimTag(scrimId));
  return AppRuntime.runPromise(
    ScrimPositionalArtifactsService.pipe(
      Effect.flatMap((svc) => svc.getScrimPositionalArtifacts(scrimId, teamId))
    )
  );
}

export async function getCachedScrimInitiation(scrimId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(scrimTag(scrimId));
  return AppRuntime.runPromise(
    ScrimInitiationService.pipe(
      Effect.flatMap((svc) => svc.getScrimInitiation(scrimId))
    )
  );
}
