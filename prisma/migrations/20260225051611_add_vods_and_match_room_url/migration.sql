-- AlterTable
ALTER TABLE "public"."ScoutingMatch" ADD COLUMN     "matchRoomUrl" TEXT,
ADD COLUMN     "vods" JSONB NOT NULL DEFAULT '[]';
