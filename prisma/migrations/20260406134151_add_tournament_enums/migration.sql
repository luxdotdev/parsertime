-- CreateEnum
CREATE TYPE "public"."TournamentFormat" AS ENUM ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS');

-- CreateEnum
CREATE TYPE "public"."TournamentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TournamentMatchStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AuditLogAction" ADD VALUE 'TOURNAMENT_CREATED';
ALTER TYPE "public"."AuditLogAction" ADD VALUE 'TOURNAMENT_UPDATED';
ALTER TYPE "public"."AuditLogAction" ADD VALUE 'TOURNAMENT_DELETED';
ALTER TYPE "public"."AuditLogAction" ADD VALUE 'TOURNAMENT_MATCH_UPDATED';
