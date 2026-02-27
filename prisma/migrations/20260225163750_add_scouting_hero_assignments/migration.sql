-- CreateTable
CREATE TABLE "public"."ScoutingHeroAssignment" (
    "id" SERIAL NOT NULL,
    "mapResultId" INTEGER NOT NULL,
    "team" TEXT NOT NULL,
    "heroName" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingHeroAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoutingHeroAssignment_mapResultId_idx" ON "public"."ScoutingHeroAssignment"("mapResultId");

-- CreateIndex
CREATE INDEX "ScoutingHeroAssignment_playerName_idx" ON "public"."ScoutingHeroAssignment"("playerName");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutingHeroAssignment_mapResultId_team_heroName_key" ON "public"."ScoutingHeroAssignment"("mapResultId", "team", "heroName");

-- AddForeignKey
ALTER TABLE "public"."ScoutingHeroAssignment" ADD CONSTRAINT "ScoutingHeroAssignment_mapResultId_fkey" FOREIGN KEY ("mapResultId") REFERENCES "public"."ScoutingMapResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
