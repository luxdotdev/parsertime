-- AlterTable
ALTER TABLE "TournamentRound" ADD COLUMN "bracket" "BracketSide" NOT NULL DEFAULT 'WINNERS';

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "grandFinalReset" BOOLEAN NOT NULL DEFAULT true;

-- DropIndex
DROP INDEX "TournamentRound_tournamentId_roundNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRound_tournamentId_bracket_roundNumber_key" ON "TournamentRound"("tournamentId", "bracket", "roundNumber");
