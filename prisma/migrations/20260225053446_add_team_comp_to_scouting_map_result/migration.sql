-- AlterTable
ALTER TABLE "public"."ScoutingMapResult" ADD COLUMN     "team1Comp" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "team2Comp" TEXT[] DEFAULT ARRAY[]::TEXT[];
