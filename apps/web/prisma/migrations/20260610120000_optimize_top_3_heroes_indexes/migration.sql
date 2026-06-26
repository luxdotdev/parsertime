-- CreateIndex
CREATE INDEX "PlayerStat_player_name_player_hero_hero_time_played_idx" ON "public"."PlayerStat"("player_name", "player_hero", "hero_time_played");

-- DropIndex
DROP INDEX "public"."Map_scrimId_idx";

-- DropIndex
DROP INDEX "public"."TeamSubstitute_teamId_idx";

-- DropIndex
DROP INDEX "public"."FaceitMapPlayerStats_faceitMapId_idx";

-- DropIndex
DROP INDEX "public"."FaceitMapTeamStats_faceitMapId_idx";

-- DropIndex
DROP INDEX "public"."FaceitMatchMap_matchId_idx";
