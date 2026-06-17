/*
  Warnings:

  - You are about to drop the column `originX` on the `MapCalibration` table. All the data in the column will be lost.
  - You are about to drop the column `originY` on the `MapCalibration` table. All the data in the column will be lost.
  - You are about to drop the column `rotation` on the `MapCalibration` table. All the data in the column will be lost.
  - You are about to drop the column `scale` on the `MapCalibration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."MapCalibration" DROP COLUMN "originX",
DROP COLUMN "originY",
DROP COLUMN "rotation",
DROP COLUMN "scale",
ADD COLUMN     "affineA" DOUBLE PRECISION,
ADD COLUMN     "affineB" DOUBLE PRECISION,
ADD COLUMN     "affineC" DOUBLE PRECISION,
ADD COLUMN     "affineD" DOUBLE PRECISION,
ADD COLUMN     "affineTx" DOUBLE PRECISION,
ADD COLUMN     "affineTy" DOUBLE PRECISION;
