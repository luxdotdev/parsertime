-- CreateTable
CREATE TABLE "public"."MapBan" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "map" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "banPosition" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "MapDataId" INTEGER NOT NULL,

    CONSTRAINT "MapBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapBan_scrimId_idx" ON "public"."MapBan"("scrimId");

-- CreateIndex
CREATE INDEX "MapBan_MapDataId_idx" ON "public"."MapBan"("MapDataId");

-- AddForeignKey
ALTER TABLE "public"."MapBan" ADD CONSTRAINT "MapBan_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
