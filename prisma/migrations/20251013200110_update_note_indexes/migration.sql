-- DropIndex
DROP INDEX "public"."Note_MapDataId_idx";

-- DropIndex
DROP INDEX "public"."Note_scrimId_idx";

-- CreateIndex
CREATE INDEX "Note_scrimId_MapDataId_idx" ON "Note"("scrimId", "MapDataId");
