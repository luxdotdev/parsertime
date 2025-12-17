/*
  Warnings:

  - Added the required column `role` to the `CalculatedStat` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('TANK', 'DAMAGE', 'SUPPORT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."CalculatedStatType" ADD VALUE 'KILLS_PER_ULTIMATE';
ALTER TYPE "public"."CalculatedStatType" ADD VALUE 'DUEL_WINRATE_PERCENTAGE';
ALTER TYPE "public"."CalculatedStatType" ADD VALUE 'FIGHT_REVERSAL_PERCENTAGE';

-- AlterTable
ALTER TABLE "public"."CalculatedStat" ADD COLUMN     "role" "public"."Role" NOT NULL;
