-- AlterTable
ALTER TABLE "public"."FaceitMatch"
ADD COLUMN "team1FaceitTeamId" TEXT,
ADD COLUMN "team2FaceitTeamId" TEXT,
ADD COLUMN "team1Name" TEXT,
ADD COLUMN "team2Name" TEXT,
ADD COLUMN "rawDetails" JSONB,
ADD COLUMN "rawVoting" JSONB;

-- CreateTable
CREATE TABLE "public"."FaceitTeam" (
    "faceitTeamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "type" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceitTeam_pkey" PRIMARY KEY ("faceitTeamId")
);

-- CreateTable
CREATE TABLE "public"."FaceitMatchTeam" (
    "id" SERIAL NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamSide" INTEGER NOT NULL,
    "faceitTeamId" TEXT,
    "teamName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "winner" BOOLEAN NOT NULL DEFAULT false,
    "rawStats" JSONB,

    CONSTRAINT "FaceitMatchTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FaceitMatchMap" (
    "id" SERIAL NOT NULL,
    "matchId" TEXT NOT NULL,
    "gameNumber" INTEGER NOT NULL,
    "mapGuid" TEXT,
    "mapName" TEXT,
    "mapType" "public"."MapType",
    "attackingFirstFaction" TEXT,
    "winnerFaction" INTEGER,
    "winnerFaceitTeamId" TEXT,
    "team1Score" INTEGER,
    "team2Score" INTEGER,
    "scoreSummary" TEXT,
    "played" BOOLEAN,
    "rawRoundStats" JSONB,
    "rawDetailedResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceitMatchMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FaceitHeroBan" (
    "id" SERIAL NOT NULL,
    "faceitMapId" INTEGER NOT NULL,
    "heroGuid" TEXT,
    "heroName" TEXT NOT NULL,
    "role" TEXT,
    "banOrder" INTEGER NOT NULL,
    "bannedByFaction" INTEGER,
    "source" TEXT NOT NULL,
    "rawEntity" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceitHeroBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FaceitMapTeamStats" (
    "id" SERIAL NOT NULL,
    "faceitMapId" INTEGER NOT NULL,
    "teamSide" INTEGER NOT NULL,
    "faceitTeamId" TEXT,
    "teamName" TEXT NOT NULL,
    "score" INTEGER,
    "won" BOOLEAN,
    "eliminations" INTEGER,
    "deaths" INTEGER,
    "finalBlows" INTEGER,
    "objectiveTime" DOUBLE PRECISION,
    "timePlayed" DOUBLE PRECISION,
    "rawStats" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceitMapTeamStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FaceitMapPlayerStats" (
    "id" SERIAL NOT NULL,
    "faceitMapId" INTEGER NOT NULL,
    "teamSide" INTEGER NOT NULL,
    "faceitPlayerId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "role" TEXT,
    "result" INTEGER,
    "eliminations" INTEGER,
    "assists" INTEGER,
    "deaths" INTEGER,
    "finalBlows" INTEGER,
    "soloKills" INTEGER,
    "multiKills" INTEGER,
    "environmentalKills" INTEGER,
    "damageDealt" DOUBLE PRECISION,
    "healingDone" DOUBLE PRECISION,
    "damageMitigated" DOUBLE PRECISION,
    "objectiveTime" DOUBLE PRECISION,
    "timePlayed" DOUBLE PRECISION,
    "rawStats" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceitMapPlayerStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaceitMatch_team1FaceitTeamId_idx" ON "public"."FaceitMatch"("team1FaceitTeamId");

-- CreateIndex
CREATE INDEX "FaceitMatch_team2FaceitTeamId_idx" ON "public"."FaceitMatch"("team2FaceitTeamId");

-- CreateIndex
CREATE INDEX "FaceitTeam_name_idx" ON "public"."FaceitTeam"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FaceitMatchTeam_matchId_teamSide_key" ON "public"."FaceitMatchTeam"("matchId", "teamSide");

-- CreateIndex
CREATE INDEX "FaceitMatchTeam_faceitTeamId_idx" ON "public"."FaceitMatchTeam"("faceitTeamId");

-- CreateIndex
CREATE INDEX "FaceitMatchTeam_teamName_idx" ON "public"."FaceitMatchTeam"("teamName");

-- CreateIndex
CREATE UNIQUE INDEX "FaceitMatchMap_matchId_gameNumber_key" ON "public"."FaceitMatchMap"("matchId", "gameNumber");

-- CreateIndex
CREATE INDEX "FaceitMatchMap_matchId_idx" ON "public"."FaceitMatchMap"("matchId");

-- CreateIndex
CREATE INDEX "FaceitMatchMap_mapGuid_idx" ON "public"."FaceitMatchMap"("mapGuid");

-- CreateIndex
CREATE INDEX "FaceitMatchMap_mapName_idx" ON "public"."FaceitMatchMap"("mapName");

-- CreateIndex
CREATE INDEX "FaceitMatchMap_mapType_idx" ON "public"."FaceitMatchMap"("mapType");

-- CreateIndex
CREATE INDEX "FaceitHeroBan_faceitMapId_idx" ON "public"."FaceitHeroBan"("faceitMapId");

-- CreateIndex
CREATE INDEX "FaceitHeroBan_heroName_idx" ON "public"."FaceitHeroBan"("heroName");

-- CreateIndex
CREATE UNIQUE INDEX "FaceitMapTeamStats_faceitMapId_teamSide_key" ON "public"."FaceitMapTeamStats"("faceitMapId", "teamSide");

-- CreateIndex
CREATE INDEX "FaceitMapTeamStats_faceitMapId_idx" ON "public"."FaceitMapTeamStats"("faceitMapId");

-- CreateIndex
CREATE INDEX "FaceitMapTeamStats_faceitTeamId_idx" ON "public"."FaceitMapTeamStats"("faceitTeamId");

-- CreateIndex
CREATE INDEX "FaceitMapTeamStats_teamName_idx" ON "public"."FaceitMapTeamStats"("teamName");

-- CreateIndex
CREATE UNIQUE INDEX "FaceitMapPlayerStats_faceitMapId_faceitPlayerId_key" ON "public"."FaceitMapPlayerStats"("faceitMapId", "faceitPlayerId");

-- CreateIndex
CREATE INDEX "FaceitMapPlayerStats_faceitMapId_idx" ON "public"."FaceitMapPlayerStats"("faceitMapId");

-- CreateIndex
CREATE INDEX "FaceitMapPlayerStats_faceitPlayerId_idx" ON "public"."FaceitMapPlayerStats"("faceitPlayerId");

-- CreateIndex
CREATE INDEX "FaceitMapPlayerStats_nickname_idx" ON "public"."FaceitMapPlayerStats"("nickname");

-- CreateIndex
CREATE INDEX "FaceitMapPlayerStats_role_idx" ON "public"."FaceitMapPlayerStats"("role");

-- AddForeignKey
ALTER TABLE "public"."FaceitMatchTeam" ADD CONSTRAINT "FaceitMatchTeam_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."FaceitMatch"("faceitMatchId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaceitMatchTeam" ADD CONSTRAINT "FaceitMatchTeam_faceitTeamId_fkey" FOREIGN KEY ("faceitTeamId") REFERENCES "public"."FaceitTeam"("faceitTeamId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaceitMatchMap" ADD CONSTRAINT "FaceitMatchMap_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."FaceitMatch"("faceitMatchId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaceitHeroBan" ADD CONSTRAINT "FaceitHeroBan_faceitMapId_fkey" FOREIGN KEY ("faceitMapId") REFERENCES "public"."FaceitMatchMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaceitMapTeamStats" ADD CONSTRAINT "FaceitMapTeamStats_faceitMapId_fkey" FOREIGN KEY ("faceitMapId") REFERENCES "public"."FaceitMatchMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaceitMapTeamStats" ADD CONSTRAINT "FaceitMapTeamStats_faceitTeamId_fkey" FOREIGN KEY ("faceitTeamId") REFERENCES "public"."FaceitTeam"("faceitTeamId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaceitMapPlayerStats" ADD CONSTRAINT "FaceitMapPlayerStats_faceitMapId_fkey" FOREIGN KEY ("faceitMapId") REFERENCES "public"."FaceitMatchMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaceitMapPlayerStats" ADD CONSTRAINT "FaceitMapPlayerStats_faceitPlayerId_fkey" FOREIGN KEY ("faceitPlayerId") REFERENCES "public"."FaceitPlayer"("faceitPlayerId") ON DELETE CASCADE ON UPDATE CASCADE;
