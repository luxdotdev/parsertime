-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."CalculatedStatType" ADD VALUE 'AVERAGE_ENGAGEMENT_DISTANCE';
ALTER TYPE "public"."CalculatedStatType" ADD VALUE 'HIGH_GROUND_KILL_PERCENTAGE';
ALTER TYPE "public"."CalculatedStatType" ADD VALUE 'ISOLATION_DEATH_PERCENTAGE';
ALTER TYPE "public"."CalculatedStatType" ADD VALUE 'AVERAGE_FIGHT_START_SPREAD';
