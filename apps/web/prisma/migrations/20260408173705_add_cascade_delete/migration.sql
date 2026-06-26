-- DropForeignKey
ALTER TABLE "public"."Ability1Used" DROP CONSTRAINT "Ability1Used_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ability2Used" DROP CONSTRAINT "Ability2Used_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CalculatedStat" DROP CONSTRAINT "CalculatedStat_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Damage" DROP CONSTRAINT "Damage_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DefensiveAssist" DROP CONSTRAINT "DefensiveAssist_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DvaRemech" DROP CONSTRAINT "DvaRemech_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EchoDuplicateEnd" DROP CONSTRAINT "EchoDuplicateEnd_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EchoDuplicateStart" DROP CONSTRAINT "EchoDuplicateStart_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Healing" DROP CONSTRAINT "Healing_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HeroBan" DROP CONSTRAINT "HeroBan_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HeroSpawn" DROP CONSTRAINT "HeroSpawn_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HeroSwap" DROP CONSTRAINT "HeroSwap_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Kill" DROP CONSTRAINT "Kill_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MapBan" DROP CONSTRAINT "MapBan_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MapData" DROP CONSTRAINT "MapData_mapId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MatchEnd" DROP CONSTRAINT "MatchEnd_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MatchStart" DROP CONSTRAINT "MatchStart_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MercyRez" DROP CONSTRAINT "MercyRez_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Note" DROP CONSTRAINT "Note_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ObjectiveCaptured" DROP CONSTRAINT "ObjectiveCaptured_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ObjectiveUpdated" DROP CONSTRAINT "ObjectiveUpdated_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OffensiveAssist" DROP CONSTRAINT "OffensiveAssist_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PayloadProgress" DROP CONSTRAINT "PayloadProgress_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlayerStat" DROP CONSTRAINT "PlayerStat_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PointProgress" DROP CONSTRAINT "PointProgress_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RemechCharged" DROP CONSTRAINT "RemechCharged_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoundEnd" DROP CONSTRAINT "RoundEnd_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoundStart" DROP CONSTRAINT "RoundStart_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SetupComplete" DROP CONSTRAINT "SetupComplete_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UltimateCharged" DROP CONSTRAINT "UltimateCharged_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UltimateEnd" DROP CONSTRAINT "UltimateEnd_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UltimateStart" DROP CONSTRAINT "UltimateStart_MapDataId_fkey";

-- AddForeignKey
ALTER TABLE "public"."HeroBan" ADD CONSTRAINT "HeroBan_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MapBan" ADD CONSTRAINT "MapBan_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalculatedStat" ADD CONSTRAINT "CalculatedStat_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MapData" ADD CONSTRAINT "MapData_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "public"."Map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DefensiveAssist" ADD CONSTRAINT "DefensiveAssist_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DvaRemech" ADD CONSTRAINT "DvaRemech_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EchoDuplicateEnd" ADD CONSTRAINT "EchoDuplicateEnd_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EchoDuplicateStart" ADD CONSTRAINT "EchoDuplicateStart_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HeroSpawn" ADD CONSTRAINT "HeroSpawn_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HeroSwap" ADD CONSTRAINT "HeroSwap_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Kill" ADD CONSTRAINT "Kill_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchEnd" ADD CONSTRAINT "MatchEnd_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchStart" ADD CONSTRAINT "MatchStart_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MercyRez" ADD CONSTRAINT "MercyRez_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObjectiveCaptured" ADD CONSTRAINT "ObjectiveCaptured_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObjectiveUpdated" ADD CONSTRAINT "ObjectiveUpdated_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OffensiveAssist" ADD CONSTRAINT "OffensiveAssist_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayloadProgress" ADD CONSTRAINT "PayloadProgress_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStat" ADD CONSTRAINT "PlayerStat_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointProgress" ADD CONSTRAINT "PointProgress_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RemechCharged" ADD CONSTRAINT "RemechCharged_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoundEnd" ADD CONSTRAINT "RoundEnd_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoundStart" ADD CONSTRAINT "RoundStart_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SetupComplete" ADD CONSTRAINT "SetupComplete_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UltimateCharged" ADD CONSTRAINT "UltimateCharged_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UltimateEnd" ADD CONSTRAINT "UltimateEnd_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UltimateStart" ADD CONSTRAINT "UltimateStart_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ability1Used" ADD CONSTRAINT "Ability1Used_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ability2Used" ADD CONSTRAINT "Ability2Used_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Damage" ADD CONSTRAINT "Damage_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Healing" ADD CONSTRAINT "Healing_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
