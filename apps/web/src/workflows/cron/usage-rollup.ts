import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { dayKey } from "@/lib/usage/rollup";
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

export async function rollupUsageDayStep(day: string): Promise<number> {
  "use step";

  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);

  return prisma.$transaction(
    async (tx) => {
      const [countRow] = await tx.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "UsageEvent"
        WHERE ts >= ${start} AND ts < ${end}
      `;

      await tx.$executeRaw`
        INSERT INTO "DailyFeatureRollup"
          (environment, day, name, "totalEvents", "uniqueUsers", "uniqueTeams")
        SELECT
          environment,
          ${day},
          name,
          COUNT(*)::integer,
          COUNT(DISTINCT NULLIF("userId", ''))::integer,
          COUNT(DISTINCT "teamId")::integer
        FROM "UsageEvent"
        WHERE ts >= ${start} AND ts < ${end}
        GROUP BY environment, name
        ON CONFLICT (environment, day, name) DO UPDATE SET
          "totalEvents" = EXCLUDED."totalEvents",
          "uniqueUsers" = EXCLUDED."uniqueUsers",
          "uniqueTeams" = EXCLUDED."uniqueTeams"
      `;

      await tx.$executeRaw`
        INSERT INTO "DailyPageRollup"
          (environment, day, path, views, "uniqueUsers")
        SELECT
          environment,
          ${day},
          path,
          COUNT(*)::integer,
          COUNT(DISTINCT NULLIF("userId", ''))::integer
        FROM "UsageEvent"
        WHERE ts >= ${start} AND ts < ${end}
          AND name = 'page_view'
          AND path IS NOT NULL
          AND path <> ''
        GROUP BY environment, path
        ON CONFLICT (environment, day, path) DO UPDATE SET
          views = EXCLUDED.views,
          "uniqueUsers" = EXCLUDED."uniqueUsers"
      `;

      await tx.$executeRaw`
        INSERT INTO "UserActiveDay" (environment, day, "userId")
        SELECT DISTINCT environment, ${day}, "userId"
        FROM "UsageEvent"
        WHERE ts >= ${start} AND ts < ${end}
          AND "userId" IS NOT NULL
          AND "userId" <> ''
        ON CONFLICT (environment, day, "userId") DO NOTHING
      `;

      return Number(countRow?.count ?? BigInt(0));
    },
    {
      isolationLevel: "RepeatableRead",
      maxWait: 20_000,
      timeout: 120_000,
    }
  );
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
