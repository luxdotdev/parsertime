-- CreateTable
CREATE TABLE "public"."ScoutingTournament" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "mapPool" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingTournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScoutingMatch" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "team1" TEXT NOT NULL,
    "team1FullName" TEXT NOT NULL,
    "team2" TEXT NOT NULL,
    "team2FullName" TEXT NOT NULL,
    "team1Score" INTEGER NOT NULL,
    "team2Score" INTEGER NOT NULL,
    "bestOf" INTEGER NOT NULL,
    "winner" TEXT NOT NULL,
    "winnerFullName" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "mvp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScoutingMapResult" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "gameNumber" INTEGER NOT NULL,
    "mapType" "public"."MapType" NOT NULL,
    "mapName" TEXT NOT NULL,
    "team1Score" TEXT NOT NULL,
    "team2Score" TEXT NOT NULL,
    "winner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingMapResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScoutingHeroBan" (
    "id" SERIAL NOT NULL,
    "mapResultId" INTEGER NOT NULL,
    "team" TEXT NOT NULL,
    "hero" TEXT NOT NULL,
    "banOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingHeroBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoutingTournament_title_key" ON "public"."ScoutingTournament"("title");

-- CreateIndex
CREATE INDEX "ScoutingMatch_tournamentId_idx" ON "public"."ScoutingMatch"("tournamentId");

-- CreateIndex
CREATE INDEX "ScoutingMatch_team1_team2_idx" ON "public"."ScoutingMatch"("team1", "team2");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutingMatch_tournamentId_team1_team2_matchDate_key" ON "public"."ScoutingMatch"("tournamentId", "team1", "team2", "matchDate");

-- CreateIndex
CREATE INDEX "ScoutingMapResult_matchId_idx" ON "public"."ScoutingMapResult"("matchId");

-- CreateIndex
CREATE INDEX "ScoutingMapResult_mapName_idx" ON "public"."ScoutingMapResult"("mapName");

-- CreateIndex
CREATE INDEX "ScoutingHeroBan_mapResultId_idx" ON "public"."ScoutingHeroBan"("mapResultId");

-- CreateIndex
CREATE INDEX "ScoutingHeroBan_hero_idx" ON "public"."ScoutingHeroBan"("hero");

-- AddForeignKey
ALTER TABLE "public"."ScoutingMatch" ADD CONSTRAINT "ScoutingMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."ScoutingTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoutingMapResult" ADD CONSTRAINT "ScoutingMapResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."ScoutingMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoutingHeroBan" ADD CONSTRAINT "ScoutingHeroBan_mapResultId_fkey" FOREIGN KEY ("mapResultId") REFERENCES "public"."ScoutingMapResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
