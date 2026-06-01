-- CreateEnum
CREATE TYPE "public"."TeamBlacklistSource" AS ENUM ('MANUAL', 'POST_SCRIM');

-- CreateEnum
CREATE TYPE "public"."ScrimFeedbackVerdict" AS ENUM ('GOOD', 'NEUTRAL', 'BLACKLISTED', 'DISMISSED');

-- AlterTable
ALTER TABLE "public"."Scrim" ADD COLUMN     "opponentTeamId" INTEGER,
ADD COLUMN     "scrimRequestId" TEXT;

-- CreateTable
CREATE TABLE "public"."TeamBlacklist" (
    "id" TEXT NOT NULL,
    "ownerTeamId" INTEGER NOT NULL,
    "blockedTeamId" INTEGER,
    "blockedTeamName" TEXT NOT NULL,
    "blockedKey" TEXT NOT NULL,
    "reason" TEXT,
    "source" "public"."TeamBlacklistSource" NOT NULL DEFAULT 'MANUAL',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScrimFeedback" (
    "id" TEXT NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "verdict" "public"."ScrimFeedbackVerdict" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrimFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamBlacklist_blockedTeamId_idx" ON "public"."TeamBlacklist"("blockedTeamId");

-- CreateIndex
CREATE INDEX "TeamBlacklist_ownerTeamId_idx" ON "public"."TeamBlacklist"("ownerTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamBlacklist_ownerTeamId_blockedKey_key" ON "public"."TeamBlacklist"("ownerTeamId", "blockedKey");

-- CreateIndex
CREATE UNIQUE INDEX "ScrimFeedback_scrimId_key" ON "public"."ScrimFeedback"("scrimId");

-- CreateIndex
CREATE INDEX "Scrim_opponentTeamId_idx" ON "public"."Scrim"("opponentTeamId");

-- AddForeignKey
ALTER TABLE "public"."Scrim" ADD CONSTRAINT "Scrim_opponentTeamId_fkey" FOREIGN KEY ("opponentTeamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scrim" ADD CONSTRAINT "Scrim_scrimRequestId_fkey" FOREIGN KEY ("scrimRequestId") REFERENCES "public"."ScrimRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamBlacklist" ADD CONSTRAINT "TeamBlacklist_ownerTeamId_fkey" FOREIGN KEY ("ownerTeamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamBlacklist" ADD CONSTRAINT "TeamBlacklist_blockedTeamId_fkey" FOREIGN KEY ("blockedTeamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamBlacklist" ADD CONSTRAINT "TeamBlacklist_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScrimFeedback" ADD CONSTRAINT "ScrimFeedback_scrimId_fkey" FOREIGN KEY ("scrimId") REFERENCES "public"."Scrim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScrimFeedback" ADD CONSTRAINT "ScrimFeedback_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
