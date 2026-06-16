import { beforeEach, expect, test, vi } from "vitest";

const { findMany, fetchEventLog, buildRows } = vi.hoisted(() => ({
  findMany: vi.fn().mockResolvedValue([]),
  fetchEventLog: vi.fn(),
  buildRows: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: { matchStart: { findMany } },
}));
vi.mock("@/lib/win-probability/training/extract", () => ({
  fetchEventLog,
  buildRows,
}));
vi.mock("@vercel/blob", () => ({
  put: vi.fn().mockResolvedValue({ url: "https://blob.test/x" }),
}));
vi.mock("@vercel/functions", () => ({
  // Run the deferred work synchronously so the trigger fetch is observable.
  waitUntil: vi.fn((p: Promise<unknown>) => p),
}));
vi.mock("@/lib/logger", () => ({
  Logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { GET } from "@/app/api/cron/wp-retrain/route";

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret-value";
  // mockClear (not mockReset/restoreAllMocks) so the @vercel/blob put factory's
  // resolved value survives between tests.
  findMany.mockClear().mockResolvedValue([]);
  fetchEventLog.mockClear();
  buildRows.mockClear();
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

test("authorized run with no maps exports nothing", async () => {
  const res = await GET(req("Bearer test-secret-value"));
  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    exported: boolean;
    runId: string;
    modes: string[];
  };
  expect(body.exported).toBe(true);
  expect(body.modes).toEqual([]);
  expect(typeof body.runId).toBe("string");
});

test("triggers the trainer with { runId, urls } when modes export", async () => {
  findMany.mockResolvedValue([{ MapDataId: 1 }]);
  fetchEventLog.mockResolvedValue({ modeFamily: "control" });
  buildRows.mockReturnValue([
    { matchId: 1, roundId: 1, label: 1, features: [0] },
  ]);
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 200 }));

  const res = await GET(req("Bearer test-secret-value"));
  expect(res.status).toBe(200);
  const body = (await res.json()) as { runId: string; modes: string[] };
  expect(body.modes).toEqual(["control"]);

  expect(fetchSpy).toHaveBeenCalledTimes(1);
  const [url, init] = fetchSpy.mock.calls[0];
  expect(String(url)).toContain("/api/wp-train");
  const sent = JSON.parse((init as RequestInit).body as string) as {
    runId: string;
    urls: Record<string, string>;
  };
  expect(sent.runId).toBe(body.runId);
  expect(sent.urls).toEqual({ control: "https://blob.test/x" });

  fetchSpy.mockRestore();
});
