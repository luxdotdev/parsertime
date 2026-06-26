-- CreateTable
CREATE TABLE "public"."MapCalibration" (
    "id" SERIAL NOT NULL,
    "mapName" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageWidth" INTEGER NOT NULL,
    "imageHeight" INTEGER NOT NULL,
    "originX" DOUBLE PRECISION,
    "originY" DOUBLE PRECISION,
    "scale" DOUBLE PRECISION,
    "rotation" DOUBLE PRECISION,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapCalibration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MapCalibrationAnchor" (
    "id" SERIAL NOT NULL,
    "calibrationId" INTEGER NOT NULL,
    "worldX" DOUBLE PRECISION NOT NULL,
    "worldY" DOUBLE PRECISION NOT NULL,
    "imageU" DOUBLE PRECISION NOT NULL,
    "imageV" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapCalibrationAnchor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MapCalibration_mapName_key" ON "public"."MapCalibration"("mapName");

-- CreateIndex
CREATE INDEX "MapCalibrationAnchor_calibrationId_idx" ON "public"."MapCalibrationAnchor"("calibrationId");

-- AddForeignKey
ALTER TABLE "public"."MapCalibrationAnchor" ADD CONSTRAINT "MapCalibrationAnchor_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES "public"."MapCalibration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
