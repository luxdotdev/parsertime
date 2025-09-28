-- AlterEnum
ALTER TYPE "public"."ColorblindMode" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "public"."AppSettings" ADD COLUMN     "customTeam1Color" TEXT,
ADD COLUMN     "customTeam2Color" TEXT;
