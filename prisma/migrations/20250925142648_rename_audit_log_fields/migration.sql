/*
  Warnings:

  - You are about to drop the column `adminName` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `userEmail` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."AuditLog_adminName_target_idx";

-- AlterTable
ALTER TABLE "public"."AuditLog" DROP COLUMN "adminName",
ADD COLUMN     "userEmail" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_userEmail_target_idx" ON "public"."AuditLog"("userEmail", "target");
