-- Migration: Index case-insensitive player_name lookups
--
-- Several hot queries match players with `player_name ILIKE $1` (exact name,
-- case-insensitive — no wildcards). ILIKE (~~*) cannot use a plain btree index,
-- so those queries fell back to a full sequential scan of "PlayerStat". The
-- profile "heroes played" query alone was ~47% of total database time.
--
-- The call sites now use `lower(player_name) = lower($1)`, which this functional
-- index serves as a direct seek. Kept non-partial so it also covers lookups that
-- do not filter on hero_time_played (e.g. the scouting-analytics maxTime CTE).
CREATE INDEX IF NOT EXISTS "idx_playerstat_lower_name"
  ON "PlayerStat" (lower(player_name));
