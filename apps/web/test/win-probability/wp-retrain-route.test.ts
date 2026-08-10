import { beforeEach, expect, test, vi } from "vitest";

const { findMany, fetchEventLog, buildRows, put, start } = vi.hoisted(() => ({
  findMany: vi.fn().mockResolvedValue([]),
  fetchEventLog: vi.fn(),
  buildRows: vi.fn(),
  put: vi.fn().mockResolvedValue({ url: "https://blob.test/x" }),
  start: vi.fn().mockResolvedValue({ runId: "workflow-run-1" }),
}));
vi.mock("@/lib/prisma", () => ({
  default: { matchStart: { findMany } },
}));
vi.mock("@/lib/win-probability/training/extract", () => ({
  fetchEventLog,
  buildRows,
}));
vi.mock("@vercel/blob", () => ({
  put,
}));
vi.mock("workflow/api", () => ({ start }));
vi.mock("@/lib/logger", () => ({
  Logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { GET } from "@/app/api/cron/wp-retrain/route";
import {
  exportWinProbabilityDatasetBatchStep,
  triggerWinProbabilityTrainerStep,
} from "@/workflows/cron/wp-retrain";

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret-value";
  // mockClear (not mockReset/restoreAllMocks) so the @vercel/blob put factory's
  // resolved value survives between tests.
  findMany.mockClear().mockResolvedValue([]);
  fetchEventLog.mockClear();
  buildRows.mockClear();
  put.mockClear().mockResolvedValue({ url: "https://blob.test/x" });
  start.mockClear().mockResolvedValue({ runId: "workflow-run-1" });
});

function req(auth?: string): Request {
  return new Request("https://x.test/api/cron/wp-retrain", {
    headers: auth ? { Authorization: auth } : {},
  });
}

test("rejects when no Authorization header is sent", async () => {
  const res = await GET(req());
  expect(res.status).toBe(401);
});

test("rejects a wrong bearer token", async () => {
  const res = await GET(req("Bearer wrong-secret-value"));
  expect(res.status).toBe(401);
});

test("fails closed when CRON_SECRET is unset", async () => {
  delete process.env.CRON_SECRET;
  const res = await GET(req("Bearer undefined"));
  expect(res.status).toBe(500);
});

test("authorized request starts a workflow and returns its run ID", async () => {
  const res = await GET(req("Bearer test-secret-value"));
  expect(res.status).toBe(202);
  const body = (await res.json()) as {
    ok: boolean;
    status: string;
    runId: string;
  };
  expect(body).toEqual({
    ok: true,
    status: "started",
    runId: "workflow-run-1",
  });
  expect(start).toHaveBeenCalledTimes(1);
});

test("dataset batch export reports no data when there are no maps", async () => {
  const result = await exportWinProbabilityDatasetBatchStep("run-empty", 0, []);
  expect(result.mapsExported).toBe(0);
  expect(result.urls).toEqual({});
  expect(put).not.toHaveBeenCalled();
});

test("exports deterministic blobs and triggers the trainer", async () => {
  fetchEventLog.mockResolvedValue({ modeFamily: "control" });
  buildRows.mockReturnValue([
    { matchId: 1, roundId: 1, label: 1, features: [0] },
  ]);
  const exported = await exportWinProbabilityDatasetBatchStep("run-1", 0, [1]);

  expect(exported.urls).toEqual({ control: ["https://blob.test/x"] });
  expect(put).toHaveBeenCalledWith(
    "wp-train/run-1/parts/0-control.csv",
    expect.any(String),
    expect.objectContaining({
      addRandomSuffix: false,
      allowOverwrite: true,
    })
  );

  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      Response.json({ published: true, runId: "run-1", trained: ["control"] })
    );

  await triggerWinProbabilityTrainerStep("run-1", exported.urls);

  expect(fetchSpy).toHaveBeenCalledTimes(1);
  const [url, init] = fetchSpy.mock.calls[0];
  expect(String(url)).toContain("/api/wp-train");
  const sent = JSON.parse((init as RequestInit).body as string) as {
    runId: string;
    urls: Record<string, string[]>;
  };
  expect(sent.runId).toBe("run-1");
  expect(sent.urls).toEqual({ control: ["https://blob.test/x"] });

  fetchSpy.mockRestore();
});

test("trainer step fails when no model was published", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      published: false,
      runId: "run-2",
      reason: "no_modes_trained",
    })
  );

  await expect(
    triggerWinProbabilityTrainerStep("run-2", {
      control: ["https://blob.test/control.csv"],
    })
  ).rejects.toThrow("no_modes_trained");

  fetchSpy.mockRestore();
});
