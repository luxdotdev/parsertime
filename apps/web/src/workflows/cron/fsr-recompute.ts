import {
  buildFsrRecomputePlan,
  type FsrRecomputePlan,
  writeFsrRecomputePlan,
} from "@/lib/fsr/compute";
import { r2 } from "@/lib/r2";
import { getWorkflowMetadata } from "workflow";
import {
  acquireLeaseStep,
  releaseLeaseStep,
  renewLeaseStep,
} from "./lease-steps";

const LEASE_KEY = "cron:fsr-recompute";

export async function fsrRecomputeWorkflow() {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  if (!(await acquireLeaseStep(LEASE_KEY, workflowRunId))) {
    return {
      groupsLoaded: 0,
      cellsWritten: 0,
      playersWritten: 0,
      baselinesWritten: 0,
      staleRowsDropped: 0,
      durationMs: 0,
      skipped: true,
    };
  }

  try {
    const planKey = await prepareFsrPlanStep(workflowRunId);
    await renewLeaseStep(LEASE_KEY, workflowRunId);
    const result = await writeFsrPlanStep(planKey);
    await deleteFsrPlanStep(planKey);
    return result;
  } finally {
    await releaseLeaseStep(LEASE_KEY, workflowRunId);
  }
}

async function prepareFsrPlanStep(runId: string): Promise<string> {
  "use step";

  const plan = await buildFsrRecomputePlan();
  const key = `workflow/fsr-recompute/${runId}/plan.json`;
  await r2.upload({
    key,
    body: Buffer.from(JSON.stringify(plan)),
    contentType: "application/json",
  });
  return key;
}

async function writeFsrPlanStep(key: string) {
  "use step";

  const body = await r2.download(key);
  return writeFsrRecomputePlan(
    JSON.parse(body.toString("utf8")) as FsrRecomputePlan
  );
}

async function deleteFsrPlanStep(key: string): Promise<void> {
  "use step";

  await r2.delete(key);
}
