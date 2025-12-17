-- Update CalculatedStat createdAt to match the actual map creation date
-- This script fixes historic stats where createdAt was set to the database insertion time
-- instead of the actual map date

UPDATE "CalculatedStat" cs
SET "createdAt" = m."createdAt",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "MapData" md
JOIN "Map" m ON md."mapId" = m.id
WHERE cs."MapDataId" = md.id
  AND cs."createdAt" != m."createdAt";

-- Display summary of changes (run after the update)
SELECT 
    COUNT(*) as total_updated_stats,
    COUNT(DISTINCT cs."scrimId") as affected_scrims,
    COUNT(DISTINCT cs."playerName") as affected_players
FROM "CalculatedStat" cs
JOIN "MapData" md ON cs."MapDataId" = md.id
JOIN "Map" m ON md."mapId" = m.id
WHERE cs."createdAt" = m."createdAt";

