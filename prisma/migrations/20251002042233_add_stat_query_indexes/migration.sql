-- Migration: Add indexes for stat percentile queries

-- Index 1: Critical index for DISTINCT ON queries with hero filtering
CREATE INDEX IF NOT EXISTS "idx_playerstat_hero_distinct" 
  ON "PlayerStat"("player_hero", "MapDataId", "player_name", "round_number" DESC, "id" DESC) 
  WHERE "hero_time_played" >= 60;

-- Index 2: Covering index for composite SR queries (OPTIONAL - only if you have PostgreSQL 11+)
-- Comment out if not on PostgreSQL 11+ or if you want to minimize index size
CREATE INDEX IF NOT EXISTS "idx_playerstat_hero_stats_covering" 
  ON "PlayerStat"("player_hero", "MapDataId", "player_name") 
  INCLUDE ("eliminations", "final_blows", "deaths", "hero_damage_dealt", "healing_dealt", 
           "damage_blocked", "damage_taken", "solo_kills", "ultimates_earned", 
           "objective_kills", "hero_time_played", "round_number", "id")
  WHERE "hero_time_played" >= 60;
