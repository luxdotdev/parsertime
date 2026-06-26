-- AlterTable
ALTER TABLE "public"."Scrim" ADD COLUMN     "autoAssignTeamNames" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "team1Name" TEXT,
ADD COLUMN     "team2Name" TEXT;
