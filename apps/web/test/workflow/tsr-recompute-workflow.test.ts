import { expect, test, vi } from "vitest";

const { acquireLeaseStep, buildTsrReplayPlan, recomputeTeamBatch } = vi.hoisted(
  () => ({
    acquireLeaseStep: vi.fn().mockResolvedValue(false),
    buildTsrReplayPlan: vi.fn(),
    recomputeTeamBatch: vi.fn(),
  })
);

vi.mock("workflow", () => ({
  getWorkflowMetadata: () => ({ workflowRunId: "workflow-run-1" }),
}));
vi.mock("@/workflows/cron/lease-steps", () => ({
  acquireLeaseStep,
  renewLeaseStep: vi.fn(),
  releaseLeaseStep: vi.fn(),
}));
vi.mock("@/lib/tsr/replay", () => ({
  buildTsrReplayPlan,
  dropStaleTsrRows: vi.fn(),
  writeTsrPlayerBatch: vi.fn(),
}));
vi.mock("@/lib/matchmaker/snapshot", () => ({
  recomputeTeamTsrSnapshotBatch: recomputeTeamBatch,
}));
vi.mock("@/lib/prisma", () => ({
  default: { team: { findMany: vi.fn() } },
}));
vi.mock("@/lib/r2", () => ({
  r2: { upload: vi.fn(), download: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/logger", () => ({ Logger: { info: vi.fn() } }));

import { tsrRecomputeWorkflow } from "@/workflows/cron/tsr-recompute";

test("a lease-conflicted TSR run does not rebuild snapshots", async () => {
  const result = await tsrRecomputeWorkflow();

  expect(result.replay.skipped).toBe(true);
  expect(result.teamSnapshots).toEqual({ written: 0, cleared: 0 });
  expect(buildTsrReplayPlan).not.toHaveBeenCalled();
  expect(recomputeTeamBatch).not.toHaveBeenCalled();
});
