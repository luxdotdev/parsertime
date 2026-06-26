-- CreateTable
CREATE TABLE "HeroBan" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "hero" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "banPosition" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "HeroBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroBan_scrimId_idx" ON "HeroBan"("scrimId");

-- CreateIndex
CREATE INDEX "HeroBan_MapDataId_idx" ON "HeroBan"("MapDataId");

-- AddForeignKey
ALTER TABLE "HeroBan" ADD CONSTRAINT "HeroBan_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;
