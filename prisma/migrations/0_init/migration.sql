-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."BillingPlan" AS ENUM ('FREE', 'BASIC', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'MANAGER', 'USER');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('defensive_assist', 'dva_remech', 'echo_duplicate_end', 'echo_duplicate_start', 'hero_spawn', 'hero_swap', 'kill', 'match_end', 'match_start', 'mercy_rez', 'objective_captured', 'objective_updated', 'offensive_assist', 'payload_progress', 'point_progress', 'player_stat', 'remech_charged', 'round_end', 'round_start', 'setup_complete', 'ultimate_charged', 'ultimate_end', 'ultimate_start');

-- CreateEnum
CREATE TYPE "public"."MapType" AS ENUM ('Clash', 'Control', 'Escort', 'Flashpoint', 'Hybrid', 'Push');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "teamId" INTEGER,
    "stripeId" TEXT,
    "billingPlan" "public"."BillingPlan" NOT NULL DEFAULT 'FREE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" TEXT,
    "ownerId" TEXT NOT NULL,
    "readonly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamManager" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TeamManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamInviteToken" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Scrim" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "teamId" INTEGER,
    "creatorId" TEXT NOT NULL,
    "guestMode" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Scrim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Map" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scrimId" INTEGER,
    "replayCode" TEXT,

    CONSTRAINT "Map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MapData" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mapId" INTEGER,

    CONSTRAINT "MapData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DefensiveAssist" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'defensive_assist',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "hero_duplicated" TEXT NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "DefensiveAssist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DvaRemech" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'dva_remech',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "ultimate_id" INTEGER NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "DvaRemech_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EchoDuplicateEnd" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'echo_duplicate_end',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "ultimate_id" INTEGER NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "EchoDuplicateEnd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EchoDuplicateStart" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'echo_duplicate_start',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "hero_duplicated" TEXT NOT NULL,
    "ultimate_id" INTEGER NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "EchoDuplicateStart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HeroSpawn" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'hero_spawn',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "previous_hero" INTEGER,
    "hero_time_played" DOUBLE PRECISION NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "HeroSpawn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HeroSwap" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'hero_swap',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "previous_hero" TEXT NOT NULL,
    "hero_time_played" DOUBLE PRECISION NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "HeroSwap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Kill" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'kill',
    "match_time" DOUBLE PRECISION NOT NULL,
    "attacker_team" TEXT NOT NULL,
    "attacker_name" TEXT NOT NULL,
    "attacker_hero" TEXT NOT NULL,
    "victim_team" TEXT NOT NULL,
    "victim_name" TEXT NOT NULL,
    "victim_hero" TEXT NOT NULL,
    "event_ability" TEXT NOT NULL,
    "event_damage" INTEGER NOT NULL,
    "is_critical_hit" TEXT NOT NULL,
    "is_environmental" TEXT NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "Kill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MatchEnd" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'match_end',
    "match_time" DOUBLE PRECISION NOT NULL,
    "round_number" INTEGER NOT NULL,
    "team_1_score" INTEGER NOT NULL,
    "team_2_score" INTEGER NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "MatchEnd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MatchStart" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'match_start',
    "match_time" DOUBLE PRECISION NOT NULL,
    "map_name" TEXT NOT NULL,
    "map_type" "public"."MapType" NOT NULL,
    "team_1_name" TEXT NOT NULL,
    "team_2_name" TEXT NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "MatchStart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MercyRez" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'mercy_rez',
    "match_time" DOUBLE PRECISION NOT NULL,
    "resurrecter_team" TEXT NOT NULL,
    "resurrecter_player" TEXT NOT NULL,
    "resurrecter_hero" TEXT NOT NULL,
    "resurrectee_team" TEXT NOT NULL,
    "resurrectee_player" TEXT NOT NULL,
    "resurrectee_hero" TEXT NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "MercyRez_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ObjectiveCaptured" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'objective_captured',
    "match_time" DOUBLE PRECISION NOT NULL,
    "round_number" INTEGER NOT NULL,
    "capturing_team" TEXT NOT NULL,
    "objective_index" INTEGER NOT NULL,
    "control_team_1_progress" DOUBLE PRECISION NOT NULL,
    "control_team_2_progress" DOUBLE PRECISION NOT NULL,
    "match_time_remaining" DOUBLE PRECISION NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "ObjectiveCaptured_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ObjectiveUpdated" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'objective_updated',
    "match_time" DOUBLE PRECISION NOT NULL,
    "round_number" INTEGER NOT NULL,
    "previous_objective_index" INTEGER NOT NULL,
    "current_objective_index" INTEGER NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "ObjectiveUpdated_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OffensiveAssist" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'offensive_assist',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "hero_duplicated" TEXT NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "OffensiveAssist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PayloadProgress" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'payload_progress',
    "match_time" DOUBLE PRECISION NOT NULL,
    "round_number" INTEGER NOT NULL,
    "capturing_team" TEXT NOT NULL,
    "objective_index" INTEGER NOT NULL,
    "payload_capture_progress" DOUBLE PRECISION NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "PayloadProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerStat" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'player_stat',
    "match_time" DOUBLE PRECISION NOT NULL,
    "round_number" INTEGER NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "eliminations" INTEGER NOT NULL,
    "final_blows" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "all_damage_dealt" DOUBLE PRECISION NOT NULL,
    "barrier_damage_dealt" DOUBLE PRECISION NOT NULL,
    "hero_damage_dealt" DOUBLE PRECISION NOT NULL,
    "healing_dealt" DOUBLE PRECISION NOT NULL,
    "healing_received" DOUBLE PRECISION NOT NULL,
    "self_healing" DOUBLE PRECISION NOT NULL,
    "damage_taken" DOUBLE PRECISION NOT NULL,
    "damage_blocked" DOUBLE PRECISION NOT NULL,
    "defensive_assists" INTEGER NOT NULL,
    "offensive_assists" INTEGER NOT NULL,
    "ultimates_earned" INTEGER NOT NULL,
    "ultimates_used" INTEGER NOT NULL,
    "multikill_best" INTEGER NOT NULL,
    "multikills" INTEGER NOT NULL,
    "solo_kills" INTEGER NOT NULL,
    "objective_kills" INTEGER NOT NULL,
    "environmental_kills" INTEGER NOT NULL,
    "environmental_deaths" INTEGER NOT NULL,
    "critical_hits" INTEGER NOT NULL,
    "critical_hit_accuracy" DOUBLE PRECISION NOT NULL,
    "scoped_accuracy" DOUBLE PRECISION NOT NULL,
    "scoped_critical_hit_accuracy" DOUBLE PRECISION NOT NULL,
    "scoped_critical_hit_kills" INTEGER NOT NULL,
    "shots_fired" INTEGER NOT NULL,
    "shots_hit" INTEGER NOT NULL,
    "shots_missed" INTEGER NOT NULL,
    "scoped_shots" INTEGER NOT NULL,
    "scoped_shots_hit" INTEGER NOT NULL,
    "weapon_accuracy" DOUBLE PRECISION NOT NULL,
    "hero_time_played" DOUBLE PRECISION NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "PlayerStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PointProgress" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'point_progress',
    "match_time" DOUBLE PRECISION NOT NULL,
    "round_number" INTEGER NOT NULL,
    "capturing_team" TEXT NOT NULL,
    "objective_index" INTEGER NOT NULL,
    "point_capture_progress" DOUBLE PRECISION NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "PointProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RemechCharged" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'remech_charged',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "hero_duplicated" TEXT NOT NULL,
    "ultimate_id" INTEGER NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "RemechCharged_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoundEnd" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'round_end',
    "match_time" DOUBLE PRECISION NOT NULL,
    "round_number" INTEGER NOT NULL,
    "capturing_team" TEXT NOT NULL,
    "team_1_score" INTEGER NOT NULL,
    "team_2_score" INTEGER NOT NULL,
    "objective_index" INTEGER NOT NULL,
    "control_team_1_progress" DOUBLE PRECISION NOT NULL,
    "control_team_2_progress" DOUBLE PRECISION NOT NULL,
    "match_time_remaining" DOUBLE PRECISION NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "RoundEnd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoundStart" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'round_start',
    "match_time" DOUBLE PRECISION NOT NULL,
    "round_number" INTEGER NOT NULL,
    "capturing_team" TEXT NOT NULL,
    "team_1_score" INTEGER NOT NULL,
    "team_2_score" INTEGER NOT NULL,
    "objective_index" INTEGER NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "RoundStart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SetupComplete" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'setup_complete',
    "match_time" DOUBLE PRECISION NOT NULL,
    "round_number" INTEGER NOT NULL,
    "match_time_remaining" DOUBLE PRECISION NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "SetupComplete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UltimateCharged" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'ultimate_charged',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "hero_duplicated" TEXT NOT NULL,
    "ultimate_id" INTEGER NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "UltimateCharged_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UltimateEnd" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'ultimate_end',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "hero_duplicated" TEXT NOT NULL,
    "ultimate_id" INTEGER NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "UltimateEnd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UltimateStart" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'ultimate_start',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "hero_duplicated" TEXT NOT NULL,
    "ultimate_id" INTEGER NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "UltimateStart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_TeamToUser" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TeamToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeId_key" ON "public"."User"("stripeId");

-- CreateIndex
CREATE INDEX "User_id_email_idx" ON "public"."User"("id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "public"."Notification"("userId");

-- CreateIndex
CREATE INDEX "TeamManager_userId_idx" ON "public"."TeamManager"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamManager_teamId_userId_key" ON "public"."TeamManager"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInviteToken_token_key" ON "public"."TeamInviteToken"("token");

-- CreateIndex
CREATE INDEX "Scrim_teamId_idx" ON "public"."Scrim"("teamId");

-- CreateIndex
CREATE INDEX "Map_scrimId_idx" ON "public"."Map"("scrimId");

-- CreateIndex
CREATE INDEX "MapData_scrimId_idx" ON "public"."MapData"("scrimId");

-- CreateIndex
CREATE INDEX "MapData_mapId_idx" ON "public"."MapData"("mapId");

-- CreateIndex
CREATE INDEX "DefensiveAssist_scrimId_idx" ON "public"."DefensiveAssist"("scrimId");

-- CreateIndex
CREATE INDEX "DefensiveAssist_MapDataId_idx" ON "public"."DefensiveAssist"("MapDataId");

-- CreateIndex
CREATE INDEX "DvaRemech_scrimId_idx" ON "public"."DvaRemech"("scrimId");

-- CreateIndex
CREATE INDEX "DvaRemech_MapDataId_idx" ON "public"."DvaRemech"("MapDataId");

-- CreateIndex
CREATE INDEX "EchoDuplicateEnd_scrimId_idx" ON "public"."EchoDuplicateEnd"("scrimId");

-- CreateIndex
CREATE INDEX "EchoDuplicateEnd_MapDataId_idx" ON "public"."EchoDuplicateEnd"("MapDataId");

-- CreateIndex
CREATE INDEX "EchoDuplicateStart_scrimId_idx" ON "public"."EchoDuplicateStart"("scrimId");

-- CreateIndex
CREATE INDEX "EchoDuplicateStart_MapDataId_idx" ON "public"."EchoDuplicateStart"("MapDataId");

-- CreateIndex
CREATE INDEX "HeroSpawn_MapDataId_idx" ON "public"."HeroSpawn"("MapDataId");

-- CreateIndex
CREATE INDEX "HeroSwap_scrimId_idx" ON "public"."HeroSwap"("scrimId");

-- CreateIndex
CREATE INDEX "HeroSwap_MapDataId_idx" ON "public"."HeroSwap"("MapDataId");

-- CreateIndex
CREATE INDEX "Kill_scrimId_idx" ON "public"."Kill"("scrimId");

-- CreateIndex
CREATE INDEX "Kill_MapDataId_idx" ON "public"."Kill"("MapDataId");

-- CreateIndex
CREATE INDEX "MatchEnd_scrimId_idx" ON "public"."MatchEnd"("scrimId");

-- CreateIndex
CREATE INDEX "MatchEnd_MapDataId_idx" ON "public"."MatchEnd"("MapDataId");

-- CreateIndex
CREATE INDEX "MatchStart_scrimId_idx" ON "public"."MatchStart"("scrimId");

-- CreateIndex
CREATE INDEX "MatchStart_MapDataId_idx" ON "public"."MatchStart"("MapDataId");

-- CreateIndex
CREATE INDEX "MercyRez_scrimId_idx" ON "public"."MercyRez"("scrimId");

-- CreateIndex
CREATE INDEX "MercyRez_MapDataId_idx" ON "public"."MercyRez"("MapDataId");

-- CreateIndex
CREATE INDEX "ObjectiveCaptured_scrimId_idx" ON "public"."ObjectiveCaptured"("scrimId");

-- CreateIndex
CREATE INDEX "ObjectiveCaptured_MapDataId_idx" ON "public"."ObjectiveCaptured"("MapDataId");

-- CreateIndex
CREATE INDEX "ObjectiveUpdated_scrimId_idx" ON "public"."ObjectiveUpdated"("scrimId");

-- CreateIndex
CREATE INDEX "ObjectiveUpdated_MapDataId_idx" ON "public"."ObjectiveUpdated"("MapDataId");

-- CreateIndex
CREATE INDEX "OffensiveAssist_scrimId_idx" ON "public"."OffensiveAssist"("scrimId");

-- CreateIndex
CREATE INDEX "OffensiveAssist_MapDataId_idx" ON "public"."OffensiveAssist"("MapDataId");

-- CreateIndex
CREATE INDEX "PayloadProgress_scrimId_idx" ON "public"."PayloadProgress"("scrimId");

-- CreateIndex
CREATE INDEX "PayloadProgress_MapDataId_idx" ON "public"."PayloadProgress"("MapDataId");

-- CreateIndex
CREATE INDEX "PlayerStat_scrimId_idx" ON "public"."PlayerStat"("scrimId");

-- CreateIndex
CREATE INDEX "PlayerStat_MapDataId_idx" ON "public"."PlayerStat"("MapDataId");

-- CreateIndex
CREATE INDEX "PointProgress_scrimId_idx" ON "public"."PointProgress"("scrimId");

-- CreateIndex
CREATE INDEX "PointProgress_MapDataId_idx" ON "public"."PointProgress"("MapDataId");

-- CreateIndex
CREATE INDEX "RemechCharged_scrimId_idx" ON "public"."RemechCharged"("scrimId");

-- CreateIndex
CREATE INDEX "RemechCharged_MapDataId_idx" ON "public"."RemechCharged"("MapDataId");

-- CreateIndex
CREATE INDEX "RoundEnd_scrimId_idx" ON "public"."RoundEnd"("scrimId");

-- CreateIndex
CREATE INDEX "RoundEnd_MapDataId_idx" ON "public"."RoundEnd"("MapDataId");

-- CreateIndex
CREATE INDEX "RoundStart_scrimId_idx" ON "public"."RoundStart"("scrimId");

-- CreateIndex
CREATE INDEX "RoundStart_MapDataId_idx" ON "public"."RoundStart"("MapDataId");

-- CreateIndex
CREATE INDEX "SetupComplete_scrimId_idx" ON "public"."SetupComplete"("scrimId");

-- CreateIndex
CREATE INDEX "SetupComplete_MapDataId_idx" ON "public"."SetupComplete"("MapDataId");

-- CreateIndex
CREATE INDEX "UltimateCharged_scrimId_idx" ON "public"."UltimateCharged"("scrimId");

-- CreateIndex
CREATE INDEX "UltimateCharged_MapDataId_idx" ON "public"."UltimateCharged"("MapDataId");

-- CreateIndex
CREATE INDEX "UltimateEnd_scrimId_idx" ON "public"."UltimateEnd"("scrimId");

-- CreateIndex
CREATE INDEX "UltimateEnd_MapDataId_idx" ON "public"."UltimateEnd"("MapDataId");

-- CreateIndex
CREATE INDEX "UltimateStart_scrimId_idx" ON "public"."UltimateStart"("scrimId");

-- CreateIndex
CREATE INDEX "UltimateStart_MapDataId_idx" ON "public"."UltimateStart"("MapDataId");

-- CreateIndex
CREATE INDEX "_TeamToUser_B_index" ON "public"."_TeamToUser"("B");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamManager" ADD CONSTRAINT "TeamManager_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamManager" ADD CONSTRAINT "TeamManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scrim" ADD CONSTRAINT "Scrim_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Map" ADD CONSTRAINT "Map_scrimId_fkey" FOREIGN KEY ("scrimId") REFERENCES "public"."Scrim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MapData" ADD CONSTRAINT "MapData_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "public"."Map"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DefensiveAssist" ADD CONSTRAINT "DefensiveAssist_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DvaRemech" ADD CONSTRAINT "DvaRemech_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EchoDuplicateEnd" ADD CONSTRAINT "EchoDuplicateEnd_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EchoDuplicateStart" ADD CONSTRAINT "EchoDuplicateStart_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HeroSpawn" ADD CONSTRAINT "HeroSpawn_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HeroSwap" ADD CONSTRAINT "HeroSwap_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Kill" ADD CONSTRAINT "Kill_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchEnd" ADD CONSTRAINT "MatchEnd_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchStart" ADD CONSTRAINT "MatchStart_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MercyRez" ADD CONSTRAINT "MercyRez_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObjectiveCaptured" ADD CONSTRAINT "ObjectiveCaptured_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObjectiveUpdated" ADD CONSTRAINT "ObjectiveUpdated_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OffensiveAssist" ADD CONSTRAINT "OffensiveAssist_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayloadProgress" ADD CONSTRAINT "PayloadProgress_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStat" ADD CONSTRAINT "PlayerStat_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointProgress" ADD CONSTRAINT "PointProgress_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RemechCharged" ADD CONSTRAINT "RemechCharged_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoundEnd" ADD CONSTRAINT "RoundEnd_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoundStart" ADD CONSTRAINT "RoundStart_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SetupComplete" ADD CONSTRAINT "SetupComplete_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UltimateCharged" ADD CONSTRAINT "UltimateCharged_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UltimateEnd" ADD CONSTRAINT "UltimateEnd_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UltimateStart" ADD CONSTRAINT "UltimateStart_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TeamToUser" ADD CONSTRAINT "_TeamToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TeamToUser" ADD CONSTRAINT "_TeamToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

