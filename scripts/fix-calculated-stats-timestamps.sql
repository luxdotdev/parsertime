-- Update CalculatedStat scrimId and createdAt to match the actual scrim and map creation date
-- This script fixes historic stats where scrimId and createdAt were set incorrectly
-- Note: MapDataId field actually contains a Map ID (field is misnamed in the schema)
-- Maps with null scrimId will be set to 0 as a fallback

UPDATE "CalculatedStat" cs
SET "scrimId" = COALESCE(m."scrimId", 0),
    "createdAt" = m."createdAt",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Map" m
WHERE cs."MapDataId" = m.id
  AND (cs."scrimId" != COALESCE(m."scrimId", 0) OR cs."createdAt" != m."createdAt");

-- Display summary of changes (run after the update)
SELECT 
    COUNT(*) as total_updated_stats,
    COUNT(DISTINCT cs."scrimId") as affected_scrims,
    COUNT(DISTINCT cs."playerName") as affected_players
FROM "CalculatedStat" cs
JOIN "Map" m ON cs."MapDataId" = m.id
WHERE cs."scrimId" = COALESCE(m."scrimId", 0) AND cs."createdAt" = m."createdAt";

