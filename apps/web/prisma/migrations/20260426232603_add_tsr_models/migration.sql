-- CreateEnum
CREATE TYPE "public"."FaceitTier" AS ENUM ('UNCLASSIFIED', 'OPEN', 'CAH', 'ADVANCED', 'EXPERT', 'MASTERS', 'OWCS');

-- CreateEnum
CREATE TYPE "public"."TsrRegion" AS ENUM ('NA', 'EMEA', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."FaceitMatchStatus" AS ENUM ('FINISHED', 'CANCELLED', 'ABORTED');

-- CreateEnum
CREATE TYPE "public"."TsrRosterOverrideAction" AS ENUM ('INCLUDE', 'EXCLUDE');

-- CreateTable
CREATE TABLE "public"."FaceitPlayer" (
    "faceitPlayerId" TEXT NOT NULL,
    "battletag" TEXT,
    "faceitNickname" TEXT NOT NULL,
    "region" "public"."TsrRegion" NOT NULL DEFAULT 'OTHER',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "ow2SkillLevel" INTEGER,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceitPlayer_pkey" PRIMARY KEY ("faceitPlayerId")
);

-- CreateTable
CREATE TABLE "public"."FaceitChampionship" (
    "championshipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "tier" "public"."FaceitTier" NOT NULL DEFAULT 'UNCLASSIFIED',
    "region" "public"."TsrRegion" NOT NULL DEFAULT 'OTHER',
    "startDate" TIMESTAMP(3),
    "classifiedBy" TEXT,
    "classifiedAt" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceitChampionship_pkey" PRIMARY KEY ("championshipId")
);

-- CreateTable
CREATE TABLE "public"."FaceitMatch" (
    "faceitMatchId" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "bestOf" INTEGER NOT NULL,
    "team1Score" INTEGER NOT NULL,
    "team2Score" INTEGER NOT NULL,
    "winnerFaction" INTEGER NOT NULL,
    "status" "public"."FaceitMatchStatus" NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "rawRegion" TEXT NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceitMatch_pkey" PRIMARY KEY ("faceitMatchId")
);

-- CreateTable
CREATE TABLE "public"."FaceitMatchRoster" (
    "id" SERIAL NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamSide" INTEGER NOT NULL,
    "faceitPlayerId" TEXT NOT NULL,

    CONSTRAINT "FaceitMatchRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TsrRosterOverride" (
    "id" SERIAL NOT NULL,
    "matchId" TEXT NOT NULL,
    "faceitPlayerId" TEXT NOT NULL,
    "action" "public"."TsrRosterOverrideAction" NOT NULL,
    "teamSide" INTEGER,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TsrRosterOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BattletagAlias" (
    "battletag" TEXT NOT NULL,
    "faceitPlayerId" TEXT NOT NULL,

    CONSTRAINT "BattletagAlias_pkey" PRIMARY KEY ("battletag")
);

-- CreateTable
CREATE TABLE "public"."PlayerTsr" (
    "faceitPlayerId" TEXT NOT NULL,
    "region" "public"."TsrRegion" NOT NULL,
    "rating" INTEGER NOT NULL,
    "matchCount" INTEGER NOT NULL,
    "recentMatchCount365d" INTEGER NOT NULL,
    "maxTierReached" "public"."FaceitTier" NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerTsr_pkey" PRIMARY KEY ("faceitPlayerId")
);

-- CreateIndex
CREATE INDEX "FaceitPlayer_battletag_idx" ON "public"."FaceitPlayer"("battletag");

-- CreateIndex
CREATE INDEX "FaceitPlayer_region_idx" ON "public"."FaceitPlayer"("region");

-- CreateIndex
CREATE INDEX "FaceitChampionship_organizerId_idx" ON "public"."FaceitChampionship"("organizerId");

-- CreateIndex
CREATE INDEX "FaceitChampionship_tier_idx" ON "public"."FaceitChampionship"("tier");

-- CreateIndex
CREATE INDEX "FaceitChampionship_organizerId_tier_idx" ON "public"."FaceitChampionship"("organizerId", "tier");

-- CreateIndex
CREATE INDEX "FaceitMatch_championshipId_idx" ON "public"."FaceitMatch"("championshipId");

-- CreateIndex
CREATE INDEX "FaceitMatch_finishedAt_idx" ON "public"."FaceitMatch"("finishedAt");

-- CreateIndex
CREATE INDEX "FaceitMatch_organizerId_finishedAt_idx" ON "public"."FaceitMatch"("organizerId", "finishedAt");

-- CreateIndex
CREATE INDEX "FaceitMatchRoster_faceitPlayerId_idx" ON "public"."FaceitMatchRoster"("faceitPlayerId");

-- CreateIndex
CREATE INDEX "FaceitMatchRoster_matchId_idx" ON "public"."FaceitMatchRoster"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "FaceitMatchRoster_matchId_faceitPlayerId_key" ON "public"."FaceitMatchRoster"("matchId", "faceitPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "TsrRosterOverride_matchId_faceitPlayerId_key" ON "public"."TsrRosterOverride"("matchId", "faceitPlayerId");

-- CreateIndex
CREATE INDEX "BattletagAlias_faceitPlayerId_idx" ON "public"."BattletagAlias"("faceitPlayerId");

-- CreateIndex
CREATE INDEX "PlayerTsr_region_rating_idx" ON "public"."PlayerTsr"("region", "rating" DESC);

-- CreateIndex
CREATE INDEX "PlayerTsr_recentMatchCount365d_idx" ON "public"."PlayerTsr"("recentMatchCount365d");

-- AddForeignKey
ALTER TABLE "public"."FaceitMatch" ADD CONSTRAINT "FaceitMatch_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "public"."FaceitChampionship"("championshipId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaceitMatchRoster" ADD CONSTRAINT "FaceitMatchRoster_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."FaceitMatch"("faceitMatchId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaceitMatchRoster" ADD CONSTRAINT "FaceitMatchRoster_faceitPlayerId_fkey" FOREIGN KEY ("faceitPlayerId") REFERENCES "public"."FaceitPlayer"("faceitPlayerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TsrRosterOverride" ADD CONSTRAINT "TsrRosterOverride_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."FaceitMatch"("faceitMatchId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TsrRosterOverride" ADD CONSTRAINT "TsrRosterOverride_faceitPlayerId_fkey" FOREIGN KEY ("faceitPlayerId") REFERENCES "public"."FaceitPlayer"("faceitPlayerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BattletagAlias" ADD CONSTRAINT "BattletagAlias_faceitPlayerId_fkey" FOREIGN KEY ("faceitPlayerId") REFERENCES "public"."FaceitPlayer"("faceitPlayerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerTsr" ADD CONSTRAINT "PlayerTsr_faceitPlayerId_fkey" FOREIGN KEY ("faceitPlayerId") REFERENCES "public"."FaceitPlayer"("faceitPlayerId") ON DELETE CASCADE ON UPDATE CASCADE;
