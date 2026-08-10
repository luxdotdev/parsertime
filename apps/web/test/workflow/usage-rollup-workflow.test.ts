import { beforeEach, expect, test, vi } from "vitest";

const { queryRaw, executeRaw, transaction } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("workflow", () => ({
  getWorkflowMetadata: () => ({ workflowRunId: "workflow-run-1" }),
}));
vi.mock("@/workflows/cron/lease-steps", () => ({
  acquireLeaseStep: vi.fn(),
  renewLeaseStep: vi.fn(),
  releaseLeaseStep: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ Logger: { info: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({
  default: { $transaction: transaction },
}));

import { rollupUsageDayStep } from "@/workflows/cron/usage-rollup";

beforeEach(() => {
  queryRaw.mockReset().mockResolvedValue([{ count: BigInt(1001) }]);
  executeRaw.mockReset().mockResolvedValue(1);
  transaction.mockReset().mockImplementation((callback) =>
    callback({
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
    })
  );
});

test("aggregates a day in the database under one repeatable-read snapshot", async () => {
  const processed = await rollupUsageDayStep("2026-08-09");

  expect(processed).toBe(1001);
  expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: "RepeatableRead",
    maxWait: 20_000,
    timeout: 120_000,
  });
  expect(queryRaw).toHaveBeenCalledTimes(1);
  expect(executeRaw).toHaveBeenCalledTimes(3);

  const sql = executeRaw.mock.calls
    .map(([strings]) => (strings as TemplateStringsArray).join("?"))
    .join("\n");
  expect(sql).toContain('INSERT INTO "DailyFeatureRollup"');
  expect(sql).toContain("COUNT(DISTINCT NULLIF(\"userId\", ''))");
  expect(sql).toContain('COUNT(DISTINCT "teamId")');
  expect(sql).toContain('INSERT INTO "DailyPageRollup"');
  expect(sql).toContain("name = 'page_view'");
  expect(sql).toContain('INSERT INTO "UserActiveDay"');
  expect(sql).toContain("SELECT DISTINCT environment");
  expect(sql).toContain("ON CONFLICT");
});

test("reports an empty day without retaining event rows", async () => {
  queryRaw.mockResolvedValueOnce([{ count: BigInt(0) }]);

  await expect(rollupUsageDayStep("2026-08-08")).resolves.toBe(0);
});
