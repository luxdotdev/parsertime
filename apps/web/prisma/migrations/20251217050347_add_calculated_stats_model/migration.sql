-- CreateEnum
CREATE TYPE "public"."CalculatedStatType" AS ENUM ('FLETA_DEADLIFT_PERCENTAGE', 'FIRST_PICK_PERCENTAGE', 'FIRST_PICK_COUNT', 'FIRST_DEATH_PERCENTAGE', 'FIRST_DEATH_COUNT', 'MVP_SCORE', 'MAP_MVP_COUNT', 'AJAX_COUNT', 'AVERAGE_ULT_CHARGE_TIME', 'AVERAGE_TIME_TO_USE_ULT', 'AVERAGE_DROUGHT_TIME');

-- CreateTable
CREATE TABLE "public"."CalculatedStat" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "playerName" TEXT NOT NULL,
    "hero" TEXT NOT NULL,
    "stat" "public"."CalculatedStatType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "MapDataId" INTEGER NOT NULL,

    CONSTRAINT "CalculatedStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalculatedStat_scrimId_MapDataId_idx" ON "public"."CalculatedStat"("scrimId", "MapDataId");

-- CreateIndex
CREATE INDEX "CalculatedStat_playerName_hero_stat_idx" ON "public"."CalculatedStat"("playerName", "hero", "stat");

-- AddForeignKey
ALTER TABLE "public"."CalculatedStat" ADD CONSTRAINT "CalculatedStat_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
