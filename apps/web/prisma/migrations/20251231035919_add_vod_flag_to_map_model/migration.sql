/*
  Warnings:

  - You are about to drop the column `vod` on the `Scrim` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Map" ADD COLUMN     "vod" TEXT;

-- AlterTable
ALTER TABLE "public"."Scrim" DROP COLUMN "vod";
