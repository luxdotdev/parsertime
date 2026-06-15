-- Migration: Drop redundant single-column indexes
--
-- Each index below is a leading-prefix duplicate of a composite unique/index on
-- the same table (per PlanetScale schema recommendations), so it provides no read
-- benefit while adding write and storage overhead. Queries that filtered on the
-- single column continue to use the leading column of the covering index.
--
-- Covered-by relationships:
--   RankedMatch_userId_idx                  -> RankedMatch_userId_sourceId_key
--   Scrim_teamId_idx                        -> Scrim_teamId_opponentTeamId_idx
--   TeamBlacklist_ownerTeamId_idx           -> TeamBlacklist_ownerTeamId_blocked*_key
--   FaceitMatchRoster_matchId_idx           -> FaceitMatchRoster_matchId_faceitPlayerId_key
--   FaceitChampionship_organizerId_idx      -> FaceitChampionship_organizerId_tier_idx
--   AvailabilitySchedule_teamId_idx         -> AvailabilitySchedule_teamId_weekStart_key
--   AvailabilityResponse_scheduleId_idx     -> AvailabilityResponse_scheduleId_name*_key
--   TournamentTeam_tournamentId_idx         -> TournamentTeam_tournamentId_seed_key
--   TournamentRound_tournamentId_idx        -> TournamentRound_tournamentId_bracket_roundNumber_key
--   TournamentMap_matchId_idx               -> TournamentMap_matchId_gameNumber_key
--   ScoutingRoster_tournamentId_idx         -> ScoutingRoster_tournamentId_teamName_key
--   ScoutingHeroAssignment_mapResultId_idx  -> ScoutingHeroAssignment_mapResultId_team_heroName_key
--   Note_scrimId_MapDataId_idx              -> Note_scrimId_MapDataId_key
--   ComparisonGroup_teamId_idx              -> ComparisonGroup_teamId_playerName_idx
--   AppliedTitle_userId_idx                 -> AppliedTitle_userId_title_key

DROP INDEX IF EXISTS "public"."RankedMatch_userId_idx";
DROP INDEX IF EXISTS "public"."Scrim_teamId_idx";
DROP INDEX IF EXISTS "public"."TeamBlacklist_ownerTeamId_idx";
DROP INDEX IF EXISTS "public"."FaceitMatchRoster_matchId_idx";
DROP INDEX IF EXISTS "public"."FaceitChampionship_organizerId_idx";
DROP INDEX IF EXISTS "public"."AvailabilitySchedule_teamId_idx";
DROP INDEX IF EXISTS "public"."AvailabilityResponse_scheduleId_idx";
DROP INDEX IF EXISTS "public"."TournamentTeam_tournamentId_idx";
DROP INDEX IF EXISTS "public"."TournamentRound_tournamentId_idx";
DROP INDEX IF EXISTS "public"."TournamentMap_matchId_idx";
DROP INDEX IF EXISTS "public"."ScoutingRoster_tournamentId_idx";
DROP INDEX IF EXISTS "public"."ScoutingHeroAssignment_mapResultId_idx";
DROP INDEX IF EXISTS "public"."Note_scrimId_MapDataId_idx";
DROP INDEX IF EXISTS "public"."ComparisonGroup_teamId_idx";
DROP INDEX IF EXISTS "public"."AppliedTitle_userId_idx";
