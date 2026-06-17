-- AlterTable: add explicit display order for maps within a scrim.
ALTER TABLE "Map" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing maps so each scrim's maps keep their current id-ascending
-- order. Without this, every map defaults to order 0 and the new sort is a no-op
-- against the old id-based ordering for historical scrims.
WITH ordered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "scrimId" ORDER BY "id" ASC) - 1 AS rn
  FROM "Map"
  WHERE "scrimId" IS NOT NULL
)
UPDATE "Map" m
SET "order" = ordered.rn
FROM ordered
WHERE m."id" = ordered."id";

-- CreateIndex
CREATE INDEX "Map_scrimId_order_idx" ON "Map"("scrimId", "order");
