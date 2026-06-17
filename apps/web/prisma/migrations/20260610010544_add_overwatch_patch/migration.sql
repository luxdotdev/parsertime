-- CreateEnum
CREATE TYPE "public"."OverwatchPatchType" AS ENUM ('SEASON', 'MID_SEASON', 'HOTFIX');

-- CreateEnum
CREATE TYPE "public"."OverwatchPatchSource" AS ENUM ('MANUAL', 'SCRAPED');

-- CreateTable
CREATE TABLE "public"."OverwatchPatch" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "public"."OverwatchPatchType" NOT NULL,
    "name" TEXT NOT NULL,
    "rawTitle" TEXT,
    "sourceUrl" TEXT,
    "bodyExcerpt" TEXT,
    "source" "public"."OverwatchPatchSource" NOT NULL DEFAULT 'SCRAPED',
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverwatchPatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OverwatchPatch_date_key" ON "public"."OverwatchPatch"("date");
