-- CreateEnum
CREATE TYPE "WinnerSource" AS ENUM ('auto_score', 'auto_coords', 'manual');

-- AlterTable
ALTER TABLE "Map" ADD COLUMN     "winner" TEXT,
ADD COLUMN     "winnerSource" "WinnerSource";
