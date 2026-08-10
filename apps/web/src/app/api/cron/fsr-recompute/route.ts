import { authorizeCron, cronAuthFailureResponse } from "@/lib/cron/authorize";
import { Logger } from "@/lib/logger";
import { fsrRecomputeWorkflow } from "@/workflows/cron/fsr-recompute";
import { start } from "workflow/api";

export async function GET(req: Request): Promise<Response> {
  const auth = authorizeCron(req);
  if (!auth.ok) {
    Logger.info({
      event: "fsr.cron.recompute",
      outcome: "denied",
      auth_reason: auth.reason,
      status_code: auth.status,
    });
    return cronAuthFailureResponse(auth);
  }

  try {
    const run = await start(fsrRecomputeWorkflow);
    Logger.info({
      event: "fsr.cron.recompute",
      outcome: "started",
      status_code: 202,
      workflow_run_id: run.runId,
    });
    return Response.json(
      { ok: true, status: "started", runId: run.runId },
      { status: 202 }
    );
  } catch (error) {
    Logger.error({
      event: "fsr.cron.recompute",
      outcome: "start_failed",
      error_message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}
