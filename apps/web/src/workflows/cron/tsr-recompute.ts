import {
  recomputeTeamTsrSnapshotBatch,
  type TeamTsrSnapshotBatchResult,
} from "@/lib/matchmaker/snapshot";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/r2";
import {
  buildTsrReplayPlan,
  dropStaleTsrRows,
  type RecomputeResult,
  type TsrPlayerWriteRow,
  writeTsrPlayerBatch,
} from "@/lib/tsr/replay";
import { getWorkflowMetadata } from "workflow";
import {
  acquireLeaseStep,
  releaseLeaseStep,
  renewLeaseStep,
} from "./lease-steps";

const TEAM_BATCH_SIZE = 25;
const PLAYER_BATCH_SIZE = 500;
const LEASE_KEY = "cron:tsr-recompute";

type PreparedReplay = {
  matchesReplayed: number;
  playersUpdated: number;
  computedAt: string;
  durationMs: number;
  batchKeys: string[];
};

export async function tsrRecomputeWorkflow() {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  if (!(await acquireLeaseStep(LEASE_KEY, workflowRunId))) {
    return {
      replay: {
        matchesReplayed: 0,
        playersUpdated: 0,
        staleRowsDropped: 0,
        durationMs: 0,
        skipped: true,
      },
      teamSnapshots: { written: 0, cleared: 0 },
    };
  }

  try {
    const prepared = await prepareRatingsReplayStep(workflowRunId);
    for (const key of prepared.batchKeys) {
      await renewLeaseStep(LEASE_KEY, workflowRunId);
      await writeRatingsBatchStep(key, prepared.computedAt);
    }
    const staleRowsDropped = await dropStaleRatingsStep(prepared.computedAt);
    for (const key of prepared.batchKeys) {
      await deleteRatingsBatchStep(key);
    }
    const replay: RecomputeResult = {
      matchesReplayed: prepared.matchesReplayed,
      playersUpdated: prepared.playersUpdated,
      staleRowsDropped,
      durationMs: prepared.durationMs,
    };
    await renewLeaseStep(LEASE_KEY, workflowRunId);
    const teamIds = await listTeamIdsStep();
    const teamSnapshots: TeamTsrSnapshotBatchResult = {
      written: 0,
      cleared: 0,
    };

    for (let index = 0; index < teamIds.length; index += TEAM_BATCH_SIZE) {
      await renewLeaseStep(LEASE_KEY, workflowRunId);
      const result = await recomputeTeamSnapshotsStep(
        teamIds.slice(index, index + TEAM_BATCH_SIZE)
      );
      teamSnapshots.written += result.written;
      teamSnapshots.cleared += result.cleared;
    }

    await logTsrRecomputeCompletionStep(replay, teamSnapshots);
    return { replay, teamSnapshots };
  } finally {
    await releaseLeaseStep(LEASE_KEY, workflowRunId);
  }
}

async function prepareRatingsReplayStep(
  runId: string
): Promise<PreparedReplay> {
  "use step";

  const plan = await buildTsrReplayPlan();
  const batchKeys: string[] = [];
  for (let index = 0; index < plan.players.length; index += PLAYER_BATCH_SIZE) {
    const key = `workflow/tsr-recompute/${runId}/players-${index / PLAYER_BATCH_SIZE}.json`;
    await r2.upload({
      key,
      body: Buffer.from(
        JSON.stringify(plan.players.slice(index, index + PLAYER_BATCH_SIZE))
      ),
      contentType: "application/json",
    });
    batchKeys.push(key);
  }
  return {
    matchesReplayed: plan.matchesReplayed,
    playersUpdated: plan.players.length,
    computedAt: plan.computedAt,
    durationMs: plan.durationMs,
    batchKeys,
  };
}

async function writeRatingsBatchStep(
  key: string,
  computedAt: string
): Promise<number> {
  "use step";

  const body = await r2.download(key);
  const rows = JSON.parse(body.toString("utf8")) as TsrPlayerWriteRow[];
  return writeTsrPlayerBatch(rows, computedAt);
}

async function deleteRatingsBatchStep(key: string): Promise<void> {
  "use step";

  await r2.delete(key);
}

async function dropStaleRatingsStep(computedAt: string): Promise<number> {
  "use step";

  return dropStaleTsrRows(computedAt);
}

async function listTeamIdsStep(): Promise<number[]> {
  "use step";

  const teams = await prisma.team.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return teams.map((team) => team.id);
}

async function recomputeTeamSnapshotsStep(teamIds: number[]) {
  "use step";

  return recomputeTeamTsrSnapshotBatch(teamIds);
}

async function logTsrRecomputeCompletionStep(
  replay: RecomputeResult,
  teamSnapshots: TeamTsrSnapshotBatchResult
) {
  "use step";

  await Promise.resolve(
    Logger.info({
      event: "tsr.workflow.recompute",
      outcome: "success",
      replay,
      team_snapshots: teamSnapshots,
    })
  );
}
