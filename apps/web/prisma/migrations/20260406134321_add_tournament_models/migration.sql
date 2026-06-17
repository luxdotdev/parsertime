-- CreateTable
CREATE TABLE "public"."Tournament" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "format" "public"."TournamentFormat" NOT NULL,
    "bestOf" INTEGER NOT NULL DEFAULT 3,
    "teamSlots" INTEGER NOT NULL DEFAULT 8,
    "status" "public"."TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TournamentTeam" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "name" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TournamentRound" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "roundName" TEXT NOT NULL,
    "bestOf" INTEGER,

    CONSTRAINT "TournamentRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TournamentMatch" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "roundId" INTEGER NOT NULL,
    "bracketPosition" INTEGER NOT NULL,
    "team1Id" INTEGER,
    "team2Id" INTEGER,
    "winnerId" INTEGER,
    "team1Score" INTEGER NOT NULL DEFAULT 0,
    "team2Score" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."TournamentMatchStatus" NOT NULL DEFAULT 'UPCOMING',
    "scheduledAt" TIMESTAMP(3),
    "scrimId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TournamentMap" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "gameNumber" INTEGER NOT NULL,
    "mapId" INTEGER,
    "winnerOverride" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tournament_creatorId_idx" ON "public"."Tournament"("creatorId");

-- CreateIndex
CREATE INDEX "TournamentTeam_tournamentId_idx" ON "public"."TournamentTeam"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentTeam_teamId_idx" ON "public"."TournamentTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeam_tournamentId_seed_key" ON "public"."TournamentTeam"("tournamentId", "seed");

-- CreateIndex
CREATE INDEX "TournamentRound_tournamentId_idx" ON "public"."TournamentRound"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRound_tournamentId_roundNumber_key" ON "public"."TournamentRound"("tournamentId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentMatch_scrimId_key" ON "public"."TournamentMatch"("scrimId");

-- CreateIndex
CREATE INDEX "TournamentMatch_tournamentId_idx" ON "public"."TournamentMatch"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentMatch_roundId_idx" ON "public"."TournamentMatch"("roundId");

-- CreateIndex
CREATE INDEX "TournamentMatch_team1Id_idx" ON "public"."TournamentMatch"("team1Id");

-- CreateIndex
CREATE INDEX "TournamentMatch_team2Id_idx" ON "public"."TournamentMatch"("team2Id");

-- CreateIndex
CREATE INDEX "TournamentMap_matchId_idx" ON "public"."TournamentMap"("matchId");

-- CreateIndex
CREATE INDEX "TournamentMap_mapId_idx" ON "public"."TournamentMap"("mapId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentMap_matchId_gameNumber_key" ON "public"."TournamentMap"("matchId", "gameNumber");

-- AddForeignKey
ALTER TABLE "public"."TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentTeam" ADD CONSTRAINT "TournamentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentRound" ADD CONSTRAINT "TournamentRound_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentMatch" ADD CONSTRAINT "TournamentMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentMatch" ADD CONSTRAINT "TournamentMatch_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."TournamentRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentMatch" ADD CONSTRAINT "TournamentMatch_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "public"."TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentMatch" ADD CONSTRAINT "TournamentMatch_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "public"."TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentMatch" ADD CONSTRAINT "TournamentMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "public"."TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentMatch" ADD CONSTRAINT "TournamentMatch_scrimId_fkey" FOREIGN KEY ("scrimId") REFERENCES "public"."Scrim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentMap" ADD CONSTRAINT "TournamentMap_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."TournamentMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentMap" ADD CONSTRAINT "TournamentMap_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "public"."Map"("id") ON DELETE SET NULL ON UPDATE CASCADE;
