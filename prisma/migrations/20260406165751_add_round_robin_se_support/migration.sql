-- AlterEnum
ALTER TYPE "public"."BracketSide" ADD VALUE 'ROUND_ROBIN';

-- AlterEnum
ALTER TYPE "public"."TournamentFormat" ADD VALUE 'ROUND_ROBIN_SE';

-- AlterTable
ALTER TABLE "public"."Tournament" ADD COLUMN     "advancingTeams" INTEGER;
