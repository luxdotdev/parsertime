-- SQL Script to Find Foreign Key Violations
-- Based on Prisma Schema
-- Run this against your PostgreSQL database

-- ============================================
-- ACCOUNT TABLE VIOLATIONS
-- ============================================
SELECT 'Account -> User' AS violation_type, COUNT(*) AS violation_count
FROM "Account" a
LEFT JOIN "User" u ON a."userId" = u.id
WHERE u.id IS NULL;

SELECT 'Account -> User (Details)' AS violation_type, a.id, a."userId"
FROM "Account" a
LEFT JOIN "User" u ON a."userId" = u.id
WHERE u.id IS NULL;

-- ============================================
-- SESSION TABLE VIOLATIONS
-- ============================================
SELECT 'Session -> User' AS violation_type, COUNT(*) AS violation_count
FROM "Session" s
LEFT JOIN "User" u ON s."userId" = u.id
WHERE u.id IS NULL;

SELECT 'Session -> User (Details)' AS violation_type, s.id, s."userId"
FROM "Session" s
LEFT JOIN "User" u ON s."userId" = u.id
WHERE u.id IS NULL;

-- ============================================
-- USER TABLE VIOLATIONS
-- ============================================
SELECT 'User -> Team' AS violation_type, COUNT(*) AS violation_count
FROM "User" u
LEFT JOIN "Team" t ON u."teamId" = t.id
WHERE u."teamId" IS NOT NULL AND t.id IS NULL;

SELECT 'User -> Team (Details)' AS violation_type, u.id, u."teamId"
FROM "User" u
LEFT JOIN "Team" t ON u."teamId" = t.id
WHERE u."teamId" IS NOT NULL AND t.id IS NULL;

-- ============================================
-- APPSETTINGS TABLE VIOLATIONS
-- ============================================
SELECT 'AppSettings -> User' AS violation_type, COUNT(*) AS violation_count
FROM "AppSettings" a
LEFT JOIN "User" u ON a."userId" = u.id
WHERE u.id IS NULL;

SELECT 'AppSettings -> User (Details)' AS violation_type, a.id, a."userId"
FROM "AppSettings" a
LEFT JOIN "User" u ON a."userId" = u.id
WHERE u.id IS NULL;

-- ============================================
-- NOTIFICATION TABLE VIOLATIONS
-- ============================================
SELECT 'Notification -> User' AS violation_type, COUNT(*) AS violation_count
FROM "Notification" n
LEFT JOIN "User" u ON n."userId" = u.id
WHERE u.id IS NULL;

SELECT 'Notification -> User (Details)' AS violation_type, n.id, n."userId"
FROM "Notification" n
LEFT JOIN "User" u ON n."userId" = u.id
WHERE u.id IS NULL;

-- ============================================
-- TEAM TABLE VIOLATIONS
-- ============================================
SELECT 'Team -> User (ownerId)' AS violation_type, COUNT(*) AS violation_count
FROM "Team" t
LEFT JOIN "User" u ON t."ownerId" = u.id
WHERE u.id IS NULL;

SELECT 'Team -> User (ownerId Details)' AS violation_type, t.id, t."ownerId"
FROM "Team" t
LEFT JOIN "User" u ON t."ownerId" = u.id
WHERE u.id IS NULL;

-- ============================================
-- TEAMMANAGER TABLE VIOLATIONS
-- ============================================
SELECT 'TeamManager -> Team' AS violation_type, COUNT(*) AS violation_count
FROM "TeamManager" tm
LEFT JOIN "Team" t ON tm."teamId" = t.id
WHERE t.id IS NULL;

SELECT 'TeamManager -> Team (Details)' AS violation_type, tm.id, tm."teamId"
FROM "TeamManager" tm
LEFT JOIN "Team" t ON tm."teamId" = t.id
WHERE t.id IS NULL;

SELECT 'TeamManager -> User' AS violation_type, COUNT(*) AS violation_count
FROM "TeamManager" tm
LEFT JOIN "User" u ON tm."userId" = u.id
WHERE u.id IS NULL;

SELECT 'TeamManager -> User (Details)' AS violation_type, tm.id, tm."userId"
FROM "TeamManager" tm
LEFT JOIN "User" u ON tm."userId" = u.id
WHERE u.id IS NULL;

-- ============================================
-- SCRIM TABLE VIOLATIONS
-- ============================================
SELECT 'Scrim -> Team' AS violation_type, COUNT(*) AS violation_count
FROM "Scrim" s
LEFT JOIN "Team" t ON s."teamId" = t.id
WHERE s."teamId" IS NOT NULL AND t.id IS NULL;

SELECT 'Scrim -> Team (Details)' AS violation_type, s.id, s."teamId"
FROM "Scrim" s
LEFT JOIN "Team" t ON s."teamId" = t.id
WHERE s."teamId" IS NOT NULL AND t.id IS NULL;

-- ============================================
-- MAP TABLE VIOLATIONS
-- ============================================
SELECT 'Map -> Scrim' AS violation_type, COUNT(*) AS violation_count
FROM "Map" m
LEFT JOIN "Scrim" s ON m."scrimId" = s.id
WHERE m."scrimId" IS NOT NULL AND s.id IS NULL;

SELECT 'Map -> Scrim (Details)' AS violation_type, m.id, m."scrimId"
FROM "Map" m
LEFT JOIN "Scrim" s ON m."scrimId" = s.id
WHERE m."scrimId" IS NOT NULL AND s.id IS NULL;

-- ============================================
-- MAPDATA TABLE VIOLATIONS
-- ============================================
SELECT 'MapData -> Map' AS violation_type, COUNT(*) AS violation_count
FROM "MapData" md
LEFT JOIN "Map" m ON md."mapId" = m.id
WHERE md."mapId" IS NOT NULL AND m.id IS NULL;

SELECT 'MapData -> Map (Details)' AS violation_type, md.id, md."mapId"
FROM "MapData" md
LEFT JOIN "Map" m ON md."mapId" = m.id
WHERE md."mapId" IS NOT NULL AND m.id IS NULL;

-- ============================================
-- HEROBAN TABLE VIOLATIONS
-- ============================================
SELECT 'HeroBan -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "HeroBan" hb
LEFT JOIN "MapData" md ON hb."MapDataId" = md.id
WHERE md.id IS NULL;

SELECT 'HeroBan -> MapData (Details)' AS violation_type, hb.id, hb."MapDataId"
FROM "HeroBan" hb
LEFT JOIN "MapData" md ON hb."MapDataId" = md.id
WHERE md.id IS NULL;

-- ============================================
-- NOTE TABLE VIOLATIONS
-- ============================================
SELECT 'Note -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "Note" n
LEFT JOIN "MapData" md ON n."MapDataId" = md.id
WHERE md.id IS NULL;

SELECT 'Note -> MapData (Details)' AS violation_type, n.id, n."MapDataId"
FROM "Note" n
LEFT JOIN "MapData" md ON n."MapDataId" = md.id
WHERE md.id IS NULL;

-- ============================================
-- EVENT TABLES VIOLATIONS (MapData references)
-- ============================================

-- DefensiveAssist
SELECT 'DefensiveAssist -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "DefensiveAssist" da
LEFT JOIN "MapData" md ON da."MapDataId" = md.id
WHERE da."MapDataId" IS NOT NULL AND md.id IS NULL;

-- DvaRemech
SELECT 'DvaRemech -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "DvaRemech" dr
LEFT JOIN "MapData" md ON dr."MapDataId" = md.id
WHERE dr."MapDataId" IS NOT NULL AND md.id IS NULL;

-- EchoDuplicateEnd
SELECT 'EchoDuplicateEnd -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "EchoDuplicateEnd" ede
LEFT JOIN "MapData" md ON ede."MapDataId" = md.id
WHERE ede."MapDataId" IS NOT NULL AND md.id IS NULL;

-- EchoDuplicateStart
SELECT 'EchoDuplicateStart -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "EchoDuplicateStart" eds
LEFT JOIN "MapData" md ON eds."MapDataId" = md.id
WHERE eds."MapDataId" IS NOT NULL AND md.id IS NULL;

-- HeroSpawn
SELECT 'HeroSpawn -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "HeroSpawn" hs
LEFT JOIN "MapData" md ON hs."MapDataId" = md.id
WHERE hs."MapDataId" IS NOT NULL AND md.id IS NULL;

-- HeroSwap
SELECT 'HeroSwap -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "HeroSwap" hs
LEFT JOIN "MapData" md ON hs."MapDataId" = md.id
WHERE hs."MapDataId" IS NOT NULL AND md.id IS NULL;

-- Kill
SELECT 'Kill -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "Kill" k
LEFT JOIN "MapData" md ON k."MapDataId" = md.id
WHERE k."MapDataId" IS NOT NULL AND md.id IS NULL;

-- MatchEnd
SELECT 'MatchEnd -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "MatchEnd" me
LEFT JOIN "MapData" md ON me."MapDataId" = md.id
WHERE me."MapDataId" IS NOT NULL AND md.id IS NULL;

-- MatchStart
SELECT 'MatchStart -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "MatchStart" ms
LEFT JOIN "MapData" md ON ms."MapDataId" = md.id
WHERE ms."MapDataId" IS NOT NULL AND md.id IS NULL;

-- MercyRez
SELECT 'MercyRez -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "MercyRez" mr
LEFT JOIN "MapData" md ON mr."MapDataId" = md.id
WHERE mr."MapDataId" IS NOT NULL AND md.id IS NULL;

-- ObjectiveCaptured
SELECT 'ObjectiveCaptured -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "ObjectiveCaptured" oc
LEFT JOIN "MapData" md ON oc."MapDataId" = md.id
WHERE oc."MapDataId" IS NOT NULL AND md.id IS NULL;

-- ObjectiveUpdated
SELECT 'ObjectiveUpdated -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "ObjectiveUpdated" ou
LEFT JOIN "MapData" md ON ou."MapDataId" = md.id
WHERE ou."MapDataId" IS NOT NULL AND md.id IS NULL;

-- OffensiveAssist
SELECT 'OffensiveAssist -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "OffensiveAssist" oa
LEFT JOIN "MapData" md ON oa."MapDataId" = md.id
WHERE oa."MapDataId" IS NOT NULL AND md.id IS NULL;

-- PayloadProgress
SELECT 'PayloadProgress -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "PayloadProgress" pp
LEFT JOIN "MapData" md ON pp."MapDataId" = md.id
WHERE pp."MapDataId" IS NOT NULL AND md.id IS NULL;

-- PlayerStat
SELECT 'PlayerStat -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "PlayerStat" ps
LEFT JOIN "MapData" md ON ps."MapDataId" = md.id
WHERE ps."MapDataId" IS NOT NULL AND md.id IS NULL;

-- PointProgress
SELECT 'PointProgress -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "PointProgress" pp
LEFT JOIN "MapData" md ON pp."MapDataId" = md.id
WHERE pp."MapDataId" IS NOT NULL AND md.id IS NULL;

-- RemechCharged
SELECT 'RemechCharged -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "RemechCharged" rc
LEFT JOIN "MapData" md ON rc."MapDataId" = md.id
WHERE rc."MapDataId" IS NOT NULL AND md.id IS NULL;

-- RoundEnd
SELECT 'RoundEnd -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "RoundEnd" re
LEFT JOIN "MapData" md ON re."MapDataId" = md.id
WHERE re."MapDataId" IS NOT NULL AND md.id IS NULL;

-- RoundStart
SELECT 'RoundStart -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "RoundStart" rs
LEFT JOIN "MapData" md ON rs."MapDataId" = md.id
WHERE rs."MapDataId" IS NOT NULL AND md.id IS NULL;

-- SetupComplete
SELECT 'SetupComplete -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "SetupComplete" sc
LEFT JOIN "MapData" md ON sc."MapDataId" = md.id
WHERE sc."MapDataId" IS NOT NULL AND md.id IS NULL;

-- UltimateCharged
SELECT 'UltimateCharged -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "UltimateCharged" uc
LEFT JOIN "MapData" md ON uc."MapDataId" = md.id
WHERE uc."MapDataId" IS NOT NULL AND md.id IS NULL;

-- UltimateEnd
SELECT 'UltimateEnd -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "UltimateEnd" ue
LEFT JOIN "MapData" md ON ue."MapDataId" = md.id
WHERE ue."MapDataId" IS NOT NULL AND md.id IS NULL;

-- UltimateStart
SELECT 'UltimateStart -> MapData' AS violation_type, COUNT(*) AS violation_count
FROM "UltimateStart" us
LEFT JOIN "MapData" md ON us."MapDataId" = md.id
WHERE us."MapDataId" IS NOT NULL AND md.id IS NULL;

-- ============================================
-- SUMMARY OF ALL VIOLATIONS
-- ============================================
SELECT 'SUMMARY' AS section, 'Total Violation Types' AS metric, COUNT(*) AS count
FROM (
  SELECT 'Account -> User' AS violation_type FROM "Account" a LEFT JOIN "User" u ON a."userId" = u.id WHERE u.id IS NULL
  UNION ALL SELECT 'Session -> User' FROM "Session" s LEFT JOIN "User" u ON s."userId" = u.id WHERE u.id IS NULL
  UNION ALL SELECT 'User -> Team' FROM "User" u LEFT JOIN "Team" t ON u."teamId" = t.id WHERE u."teamId" IS NOT NULL AND t.id IS NULL
  UNION ALL SELECT 'AppSettings -> User' FROM "AppSettings" a LEFT JOIN "User" u ON a."userId" = u.id WHERE u.id IS NULL
  UNION ALL SELECT 'Notification -> User' FROM "Notification" n LEFT JOIN "User" u ON n."userId" = u.id WHERE u.id IS NULL
  UNION ALL SELECT 'Team -> User (ownerId)' FROM "Team" t LEFT JOIN "User" u ON t."ownerId" = u.id WHERE u.id IS NULL
  UNION ALL SELECT 'TeamManager -> Team' FROM "TeamManager" tm LEFT JOIN "Team" t ON tm."teamId" = t.id WHERE t.id IS NULL
  UNION ALL SELECT 'TeamManager -> User' FROM "TeamManager" tm LEFT JOIN "User" u ON tm."userId" = u.id WHERE u.id IS NULL
  UNION ALL SELECT 'Scrim -> Team' FROM "Scrim" s LEFT JOIN "Team" t ON s."teamId" = t.id WHERE s."teamId" IS NOT NULL AND t.id IS NULL
  UNION ALL SELECT 'Map -> Scrim' FROM "Map" m LEFT JOIN "Scrim" s ON m."scrimId" = s.id WHERE m."scrimId" IS NOT NULL AND s.id IS NULL
  UNION ALL SELECT 'MapData -> Map' FROM "MapData" md LEFT JOIN "Map" m ON md."mapId" = m.id WHERE md."mapId" IS NOT NULL AND m.id IS NULL
  UNION ALL SELECT 'HeroBan -> MapData' FROM "HeroBan" hb LEFT JOIN "MapData" md ON hb."MapDataId" = md.id WHERE md.id IS NULL
  UNION ALL SELECT 'Note -> MapData' FROM "Note" n LEFT JOIN "MapData" md ON n."MapDataId" = md.id WHERE md.id IS NULL
) violations;


