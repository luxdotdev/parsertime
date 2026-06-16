-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AuditLogAction" ADD VALUE 'TEAM_SUBSTITUTE_MARKED';
ALTER TYPE "public"."AuditLogAction" ADD VALUE 'TEAM_SUBSTITUTE_UNMARKED';

-- CreateTable
CREATE TABLE "public"."TeamSubstitute" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "playerName" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSubstitute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamSubstitute_teamId_idx" ON "public"."TeamSubstitute"("teamId");

-- CreateIndex
CREATE INDEX "TeamSubstitute_createdBy_idx" ON "public"."TeamSubstitute"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSubstitute_teamId_playerName_key" ON "public"."TeamSubstitute"("teamId", "playerName");

-- AddForeignKey
ALTER TABLE "public"."TeamSubstitute" ADD CONSTRAINT "TeamSubstitute_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamSubstitute" ADD CONSTRAINT "TeamSubstitute_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
