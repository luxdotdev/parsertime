/*
  Warnings:

  - You are about to drop the `NoteData` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `MapDataId` on table `HeroBan` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."HeroBan" DROP CONSTRAINT "HeroBan_MapDataId_fkey";

-- DropForeignKey
ALTER TABLE "public"."NoteData" DROP CONSTRAINT "NoteData_MapDataId_fkey";

-- AlterTable
ALTER TABLE "public"."HeroBan" ALTER COLUMN "MapDataId" SET NOT NULL;

-- DropTable
DROP TABLE "public"."NoteData";

-- CreateTable
CREATE TABLE "public"."Note" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "scrimId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "MapDataId" INTEGER NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_scrimId_idx" ON "public"."Note"("scrimId");

-- CreateIndex
CREATE INDEX "Note_MapDataId_idx" ON "public"."Note"("MapDataId");

-- CreateIndex
CREATE UNIQUE INDEX "Note_scrimId_MapDataId_key" ON "public"."Note"("scrimId", "MapDataId");

-- AddForeignKey
ALTER TABLE "public"."HeroBan" ADD CONSTRAINT "HeroBan_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
