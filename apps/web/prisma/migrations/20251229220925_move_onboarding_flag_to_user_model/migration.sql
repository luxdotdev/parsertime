/*
  Warnings:

  - You are about to drop the column `seeOnboarding` on the `AppSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."AppSettings" DROP COLUMN "seeOnboarding";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "seenOnboarding" BOOLEAN NOT NULL DEFAULT false;
