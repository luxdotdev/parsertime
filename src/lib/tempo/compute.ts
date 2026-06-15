import { AppRuntime } from "@/data/runtime";
import { TeamQuickWinsService, TeamUltService } from "@/data/team";
import { TempoMetric } from "@/generated/prisma/client";
import {
  bucketTeamSamples,
  summarize,
  type TeamTempoSample,
  type TempoMetricKey,
} from "@/lib/tempo/aggregate";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { Effect } from "effect";

/** How many teams to process concurrently (bounded by the DB pool). */
const CONCURRENCY = 6;

const METRIC_ENUM: Record<TempoMetricKey, TempoMetric> = {
  FIGHT_DURATION: TempoMetric.FIGHT_DURATION,
  ULT_CHARGE_TIME: TempoMetric.ULT_CHARGE_TIME,
  ULT_HOLD_TIME: TempoMetric.ULT_HOLD_TIME,
};

export type TempoRecomputeResult = {
  teamsConsidered: number;
  teamsFailed: number;
  baselinesWritten: number;
  perMetricSampleN: Record<TempoMetricKey, number>;
};

async function sampleTeam(teamId: number): Promise<TeamTempoSample> {
  const mapRows = await prisma.scrim.findMany({
    where: { teamId },
    select: { id: true },
  });
  const scrimIds = mapRows.map((r) => r.id);
  // RAW scrim-map count: all MapData rows for the team's scrims. This can exceed
  // the service-eligible map count (the quick-wins/ult services exclude some map
  // types and substitute maps); used only as a coarse noise-floor gate, not in
  // the statistics.
  const mapCount =
    scrimIds.length === 0
      ? 0
      : await prisma.mapData.count({ where: { scrimId: { in: scrimIds } } });

  const [quickWins, ult] = await Promise.all([
    AppRuntime.runPromise(
      TeamQuickWinsService.pipe(
        Effect.flatMap((svc) => svc.getQuickWinsStats(teamId))
      )
    ),
    AppRuntime.runPromise(
      TeamUltService.pipe(Effect.flatMap((svc) => svc.getTeamUltStats(teamId)))
    ),
  ]);

  return {
    mapCount,
    fightDuration: quickWins.averageFightDuration,
    chargeTime: ult.avgChargeTime,
    holdTime: ult.avgHoldTime,
  };
}

/**
 * Recompute the global tempo baselines across the between-team distribution and
 * upsert one row per metric. Idempotent.
 */
export async function recomputeTempoBaselines(): Promise<TempoRecomputeResult> {
  const teams = await prisma.team.findMany({ select: { id: true } });

  const samples: TeamTempoSample[] = [];
  let teamsFailed = 0;
  for (let i = 0; i < teams.length; i += CONCURRENCY) {
    const chunk = teams.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.allSettled(
      chunk.map((t) => sampleTeam(t.id))
    );
    for (let j = 0; j < chunkResults.length; j++) {
      const result = chunkResults[j];
      if (result.status === "fulfilled") {
        samples.push(result.value);
      } else {
        teamsFailed++;
        Logger.warn(
          `Tempo baseline recompute: dropping team ${chunk[j].id} after sampleTeam failure`,
          result.reason
        );
      }
    }
  }

  const buckets = bucketTeamSamples(samples);
  const computedAt = new Date();
  const perMetricSampleN: Record<TempoMetricKey, number> = {
    FIGHT_DURATION: 0,
    ULT_CHARGE_TIME: 0,
    ULT_HOLD_TIME: 0,
  };
  let baselinesWritten = 0;

  for (const key of Object.keys(buckets) as TempoMetricKey[]) {
    const values = buckets[key];
    perMetricSampleN[key] = values.length;
    if (values.length === 0) continue;
    const { mean, stdDev, sampleN } = summarize(values);
    await prisma.tempoBaseline.upsert({
      where: { metric: METRIC_ENUM[key] },
      create: { metric: METRIC_ENUM[key], mean, stdDev, sampleN, computedAt },
      update: { mean, stdDev, sampleN, computedAt },
    });
    baselinesWritten++;
  }

  return {
    teamsConsidered: teams.length,
    teamsFailed,
    baselinesWritten,
    perMetricSampleN,
  };
}
