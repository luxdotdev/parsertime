-- CreateEnum
CREATE TYPE "public"."RosterCategory" AS ENUM ('player', 'staff', 'substitute');

-- CreateEnum
CREATE TYPE "public"."RosterRole" AS ENUM ('DPS', 'Tank', 'Support', 'Flex', 'Coach', 'HeadCoach', 'AssistantCoach', 'Manager', 'AssistantManager', 'TeamManager', 'Analyst', 'PerformanceCoach', 'Substitute');

-- CreateTable
CREATE TABLE "public"."ScoutingRoster" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "teamName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScoutingRosterPlayer" (
    "id" SERIAL NOT NULL,
    "rosterId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "public"."RosterRole" NOT NULL,
    "country" TEXT NOT NULL,
    "didNotPlay" BOOLEAN NOT NULL DEFAULT false,
    "category" "public"."RosterCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingRosterPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoutingRoster_tournamentId_idx" ON "public"."ScoutingRoster"("tournamentId");

-- CreateIndex
CREATE INDEX "ScoutingRoster_teamName_idx" ON "public"."ScoutingRoster"("teamName");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutingRoster_tournamentId_teamName_key" ON "public"."ScoutingRoster"("tournamentId", "teamName");

-- CreateIndex
CREATE INDEX "ScoutingRosterPlayer_rosterId_idx" ON "public"."ScoutingRosterPlayer"("rosterId");

-- CreateIndex
CREATE INDEX "ScoutingRosterPlayer_displayName_idx" ON "public"."ScoutingRosterPlayer"("displayName");

-- AddForeignKey
ALTER TABLE "public"."ScoutingRoster" ADD CONSTRAINT "ScoutingRoster_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."ScoutingTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoutingRosterPlayer" ADD CONSTRAINT "ScoutingRosterPlayer_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "public"."ScoutingRoster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
