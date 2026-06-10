-- CreateEnum
CREATE TYPE "public"."MapZoneCategory" AS ENUM ('POINT', 'LANE');

-- CreateEnum
CREATE TYPE "public"."MapZoneStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "public"."MapZoneSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."LaneRole" AS ENUM ('MAIN', 'FLANK');

-- CreateTable
CREATE TABLE "public"."MapZone" (
    "id" SERIAL NOT NULL,
    "calibrationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."MapZoneCategory" NOT NULL,
    "status" "public"."MapZoneStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "public"."MapZoneSource" NOT NULL DEFAULT 'MANUAL',
    "laneRole" "public"."LaneRole",
    "vertices" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapZone_calibrationId_status_idx" ON "public"."MapZone"("calibrationId", "status");

-- AddForeignKey
ALTER TABLE "public"."MapZone" ADD CONSTRAINT "MapZone_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES "public"."MapCalibration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
