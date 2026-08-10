-- Durable workflow mutual exclusion (safe behind transaction-mode PgBouncer).
CREATE TABLE "WorkflowLease" (
    "key" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowLease_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "WorkflowLease_expiresAt_idx" ON "WorkflowLease"("expiresAt");

-- Idempotency and result storage for the at-least-once WP trainer handoff.
CREATE TABLE "WpTrainingRun" (
    "runId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB,
    "leaseUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WpTrainingRun_pkey" PRIMARY KEY ("runId")
);

CREATE INDEX "WpTrainingRun_status_leaseUntil_idx" ON "WpTrainingRun"("status", "leaseUntil");
