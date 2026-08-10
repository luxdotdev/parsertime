import { beforeEach, expect, test, vi } from "vitest";

const { queryRaw, updateMany, deleteMany } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $queryRaw: queryRaw,
    workflowLease: { updateMany, deleteMany },
  },
}));

import {
  acquireWorkflowLease,
  releaseWorkflowLease,
  renewWorkflowLease,
} from "@/lib/workflow/lease";

beforeEach(() => {
  queryRaw.mockReset();
  updateMany.mockReset();
  deleteMany.mockReset();
});

test("acquires only when the conditional upsert returns this owner", async () => {
  queryRaw.mockResolvedValueOnce([{ ownerId: "run-1" }]);
  await expect(acquireWorkflowLease("job", "run-1")).resolves.toBe(true);

  queryRaw.mockResolvedValueOnce([]);
  await expect(acquireWorkflowLease("job", "run-2")).resolves.toBe(false);
});

test("fails renewal after ownership is lost", async () => {
  updateMany.mockResolvedValue({ count: 0 });
  await expect(renewWorkflowLease("job", "run-1")).rejects.toThrow(
    "no longer owned"
  );
});

test("release is scoped to the current owner", async () => {
  deleteMany.mockResolvedValue({ count: 1 });
  await releaseWorkflowLease("job", "run-1");
  expect(deleteMany).toHaveBeenCalledWith({
    where: { key: "job", ownerId: "run-1" },
  });
});
