-- Preview what will be changed when fixing CalculatedStat timestamps
-- Run this BEFORE running the fix script to see what will be updated

-- Summary of stats that need updating
SELECT 
    COUNT(*) as total_stats_to_update,
    COUNT(DISTINCT cs."scrimId") as scrims_affected,
    COUNT(DISTINCT cs."playerName") as players_affected,
    MIN(cs."createdAt") as oldest_incorrect_timestamp,
    MAX(cs."createdAt") as newest_incorrect_timestamp,
    MIN(m."createdAt") as oldest_actual_map_date,
    MAX(m."createdAt") as newest_actual_map_date
FROM "CalculatedStat" cs
JOIN "MapData" md ON cs."MapDataId" = md.id
JOIN "Map" m ON md."mapId" = m.id
WHERE cs."createdAt" != m."createdAt";

-- Sample of records that will be updated (first 20)
SELECT 
    cs.id,
    cs."scrimId",
    cs."MapDataId",
    m.id as map_id,
    m.name as map_name,
    cs."playerName",
    cs.hero,
    cs.stat,
    cs."createdAt" as current_timestamp,
    m."createdAt" as correct_timestamp,
    (cs."createdAt" - m."createdAt") as time_difference
FROM "CalculatedStat" cs
JOIN "MapData" md ON cs."MapDataId" = md.id
JOIN "Map" m ON md."mapId" = m.id
WHERE cs."createdAt" != m."createdAt"
ORDER BY cs.id
LIMIT 20;

-- Breakdown by map
SELECT 
    m.id as map_id,
    m.name as map_name,
    m."createdAt" as map_date,
    cs."scrimId",
    COUNT(*) as stats_to_update,
    MIN(cs."createdAt") as oldest_stat_timestamp,
    MAX(cs."createdAt") as newest_stat_timestamp
FROM "CalculatedStat" cs
JOIN "MapData" md ON cs."MapDataId" = md.id
JOIN "Map" m ON md."mapId" = m.id
WHERE cs."createdAt" != m."createdAt"
GROUP BY m.id, m.name, m."createdAt", cs."scrimId"
ORDER BY m."createdAt" DESC;

