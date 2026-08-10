import { authorizeCron, cronAuthFailureResponse } from "@/lib/cron/authorize";
import { Logger } from "@/lib/logger";
import { tsrEnrichWorkflow } from "@/workflows/cron/tsr-enrich";
import { start } from "workflow/api";

export async function GET(req: Request): Promise<Response> {
  const auth = authorizeCron(req);
  if (!auth.ok) {
    Logger.info({
      event: "tsr.cron.enrich",
      outcome: "denied",
      auth_reason: auth.reason,
      status_code: auth.status,
    });
    return cronAuthFailureResponse(auth);
  }

  try {
    const run = await start(tsrEnrichWorkflow);
    Logger.info({
      event: "tsr.cron.enrich",
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
      event: "tsr.cron.enrich",
      outcome: "start_failed",
      error_message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}
