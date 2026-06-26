/*
  Warnings:

  - You are about to drop the `audit_log` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."audit_log";

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" SERIAL NOT NULL,
    "adminName" TEXT NOT NULL,
    "action" "public"."AuditLogAction" NOT NULL,
    "target" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_adminName_target_idx" ON "public"."AuditLog"("adminName", "target");
