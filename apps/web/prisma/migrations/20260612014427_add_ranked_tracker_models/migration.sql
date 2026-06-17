-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "rankedStatsPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."RankedMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "map" TEXT NOT NULL,
    "mapType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "groupSize" INTEGER NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RankedMatchHero" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "hero" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,

    CONSTRAINT "RankedMatchHero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RankedImportClaim" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "oauthKey" TEXT,
    "payload" JSONB NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankedImportClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankedMatch_userId_idx" ON "public"."RankedMatch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RankedMatch_userId_sourceId_key" ON "public"."RankedMatch"("userId", "sourceId");

-- CreateIndex
CREATE INDEX "RankedMatchHero_matchId_idx" ON "public"."RankedMatchHero"("matchId");

-- CreateIndex
CREATE INDEX "RankedImportClaim_email_idx" ON "public"."RankedImportClaim"("email");

-- AddForeignKey
ALTER TABLE "public"."RankedMatch" ADD CONSTRAINT "RankedMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RankedMatchHero" ADD CONSTRAINT "RankedMatchHero_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."RankedMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
