import { authorizeCron, cronAuthFailureResponse } from "@/lib/cron/authorize";
import { Logger } from "@/lib/logger";
import { winProbabilityRetrainWorkflow } from "@/workflows/cron/wp-retrain";
import { start } from "workflow/api";

export async function GET(req: Request): Promise<Response> {
  const auth = authorizeCron(req);
  if (!auth.ok) {
    Logger.info({
      event: "wp.cron.retrain",
      outcome: "denied",
      auth_reason: auth.reason,
      status_code: auth.status,
    });
    return cronAuthFailureResponse(auth);
  }

  try {
    const run = await start(winProbabilityRetrainWorkflow);
    Logger.info({
      event: "wp.cron.retrain",
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
      event: "wp.cron.retrain",
      outcome: "start_failed",
      error_message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}
