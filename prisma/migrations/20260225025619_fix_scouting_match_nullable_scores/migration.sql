-- DropIndex
DROP INDEX "public"."ScoutingMatch_tournamentId_team1_team2_matchDate_key";

-- AlterTable
ALTER TABLE "public"."ScoutingMatch" ALTER COLUMN "team1Score" DROP NOT NULL,
ALTER COLUMN "team2Score" DROP NOT NULL;
