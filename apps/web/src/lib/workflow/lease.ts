import prisma from "@/lib/prisma";

const DEFAULT_LEASE_MS = 30 * 60 * 1000;

type LeaseRow = { ownerId: string };

/**
 * Atomically acquire an expiring workflow lease. The conditional upsert is a
 * single transaction, so it works through transaction-mode PgBouncer.
 */
export async function acquireWorkflowLease(
  key: string,
  ownerId: string,
  leaseMs = DEFAULT_LEASE_MS
): Promise<boolean> {
  const expiresAt = new Date(Date.now() + leaseMs);
  const rows = await prisma.$queryRaw<LeaseRow[]>`
    INSERT INTO "WorkflowLease" ("key", "ownerId", "expiresAt", "createdAt", "updatedAt")
    VALUES (${key}, ${ownerId}, ${expiresAt}, NOW(), NOW())
    ON CONFLICT ("key") DO UPDATE
      SET "ownerId" = EXCLUDED."ownerId",
          "expiresAt" = EXCLUDED."expiresAt",
          "updatedAt" = NOW()
      WHERE "WorkflowLease"."expiresAt" <= NOW()
    RETURNING "ownerId"
  `;
  return rows[0]?.ownerId === ownerId;
}

/** Extend a lease only if this run still owns it. */
export async function renewWorkflowLease(
  key: string,
  ownerId: string,
  leaseMs = DEFAULT_LEASE_MS
): Promise<void> {
  const expiresAt = new Date(Date.now() + leaseMs);
  const updated = await prisma.workflowLease.updateMany({
    where: { key, ownerId, expiresAt: { gt: new Date() } },
    data: { expiresAt },
  });
  if (updated.count !== 1) {
    throw new Error(`Workflow lease ${key} is no longer owned by ${ownerId}`);
  }
}

/** Release only this run's lease; never delete a successor's lease. */
export async function releaseWorkflowLease(
  key: string,
  ownerId: string
): Promise<void> {
  await prisma.workflowLease.deleteMany({ where: { key, ownerId } });
}
