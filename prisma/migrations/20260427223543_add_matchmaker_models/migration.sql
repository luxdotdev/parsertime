-- CreateEnum
CREATE TYPE "public"."TeamTsrSource" AS ENUM ('TSR', 'PREDICTED', 'CSR_FALLBACK');

-- CreateEnum
CREATE TYPE "public"."TeamTsrConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "public"."TeamTsrSnapshot" (
    "teamId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "source" "public"."TeamTsrSource" NOT NULL,
    "confidence" "public"."TeamTsrConfidence" NOT NULL,
    "bracketTier" "public"."FaceitTier" NOT NULL,
    "bracketBand" TEXT,
    "region" "public"."TsrRegion" NOT NULL,
    "rosterSize" INTEGER NOT NULL,
    "ratedCount" INTEGER NOT NULL,
    "playtimeBackedShare" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamTsrSnapshot_pkey" PRIMARY KEY ("teamId")
);

-- CreateTable
CREATE TABLE "public"."ScrimRequest" (
    "id" TEXT NOT NULL,
    "fromTeamId" INTEGER NOT NULL,
    "toTeamId" INTEGER NOT NULL,
    "sentByUserId" TEXT NOT NULL,
    "fromTsr" INTEGER NOT NULL,
    "toTsr" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrimRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamTsrSnapshot_region_rating_idx" ON "public"."TeamTsrSnapshot"("region", "rating");

-- CreateIndex
CREATE INDEX "TeamTsrSnapshot_bracketTier_bracketBand_idx" ON "public"."TeamTsrSnapshot"("bracketTier", "bracketBand");

-- CreateIndex
CREATE INDEX "ScrimRequest_fromTeamId_createdAt_idx" ON "public"."ScrimRequest"("fromTeamId", "createdAt");

-- CreateIndex
CREATE INDEX "ScrimRequest_toTeamId_createdAt_idx" ON "public"."ScrimRequest"("toTeamId", "createdAt");

-- CreateIndex
CREATE INDEX "ScrimRequest_fromTeamId_toTeamId_createdAt_idx" ON "public"."ScrimRequest"("fromTeamId", "toTeamId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."TeamTsrSnapshot" ADD CONSTRAINT "TeamTsrSnapshot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScrimRequest" ADD CONSTRAINT "ScrimRequest_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScrimRequest" ADD CONSTRAINT "ScrimRequest_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScrimRequest" ADD CONSTRAINT "ScrimRequest_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
