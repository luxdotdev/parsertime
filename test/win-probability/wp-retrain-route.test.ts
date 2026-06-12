import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: { matchStart: { findMany: vi.fn().mockResolvedValue([]) } },
}));
vi.mock("@/lib/win-probability/training/extract", () => ({
  fetchEventLog: vi.fn(),
  buildRows: vi.fn(),
}));
vi.mock("@/lib/win-probability/artifact-store", () => ({
  publishArtifact: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  Logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { GET } from "@/app/api/cron/wp-retrain/route";

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret-value";
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

test("authorized run with no maps reports published: false", async () => {
  const res = await GET(req("Bearer test-secret-value"));
  expect(res.status).toBe(200);
  const body = (await res.json()) as { published: boolean };
  expect(body.published).toBe(false);
});
