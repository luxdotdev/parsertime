import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  aggregateActiveUsers,
  aggregateFeatureRollups,
  aggregatePageRollups,
  dayKey,
} from "@/lib/usage/rollup";
import { getWorkflowMetadata } from "workflow";
import {
  acquireLeaseStep,
  releaseLeaseStep,
  renewLeaseStep,
} from "./lease-steps";

const LEASE_KEY = "cron:usage-rollup";

export async function usageRollupWorkflow() {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  if (!(await acquireLeaseStep(LEASE_KEY, workflowRunId))) {
    return { processed: {}, skipped: true };
  }
  const days = await listUsageRollupDaysStep(new Date().toISOString());
  const processed: Record<string, number> = {};
  for (const day of days) {
    await renewLeaseStep(LEASE_KEY, workflowRunId);
    processed[day] = await rollupUsageDayStep(day);
  }

  await logUsageRollupCompletionStep(processed);
  await releaseLeaseStep(LEASE_KEY, workflowRunId);
  return { processed };
}

async function listUsageRollupDaysStep(anchorIso: string): Promise<string[]> {
  "use step";

  const today = new Date(anchorIso);
  const days: string[] = [];
  for (let back = 1; back <= 7; back++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - back);
    const day = dayKey(date);
    const existing = await prisma.dailyFeatureRollup.count({ where: { day } });
    if (back === 1 || existing === 0) days.push(day);
  }
  return days;
}

async function rollupUsageDayStep(day: string): Promise<number> {
  "use step";

  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);

  const rows = await prisma.usageEvent.findMany({
    where: { ts: { gte: start, lt: end } },
    select: {
      name: true,
      environment: true,
      userId: true,
      teamId: true,
      path: true,
    },
  });
  const features = aggregateFeatureRollups(rows, day);
  const pages = aggregatePageRollups(rows, day);
  const actives = aggregateActiveUsers(rows, day);

  await prisma.$transaction([
    ...features.map((feature) =>
      prisma.dailyFeatureRollup.upsert({
        where: {
          environment_day_name: {
            environment: feature.environment,
            day: feature.day,
            name: feature.name,
          },
        },
        create: feature,
        update: {
          totalEvents: feature.totalEvents,
          uniqueUsers: feature.uniqueUsers,
          uniqueTeams: feature.uniqueTeams,
        },
      })
    ),
    ...pages.map((page) =>
      prisma.dailyPageRollup.upsert({
        where: {
          environment_day_path: {
            environment: page.environment,
            day: page.day,
            path: page.path,
          },
        },
        create: page,
        update: { views: page.views, uniqueUsers: page.uniqueUsers },
      })
    ),
    ...actives.map((active) =>
      prisma.userActiveDay.upsert({
        where: {
          environment_day_userId: {
            environment: active.environment,
            day: active.day,
            userId: active.userId,
          },
        },
        create: active,
        update: {},
      })
    ),
  ]);

  return rows.length;
}

async function logUsageRollupCompletionStep(processed: Record<string, number>) {
  "use step";

  await Promise.resolve(
    Logger.info({
      event: "usage.workflow.rollup",
      outcome: "success",
      processed,
    })
  );
}
