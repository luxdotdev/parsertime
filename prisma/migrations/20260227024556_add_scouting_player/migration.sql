-- CreateTable
CREATE TABLE "public"."ScoutingPlayer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "signatureHeroes" TEXT[],
    "winnings" INTEGER NOT NULL DEFAULT 0,
    "region" TEXT NOT NULL,
    "playerUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoutingPlayer_playerUrl_key" ON "public"."ScoutingPlayer"("playerUrl");

-- CreateIndex
CREATE INDEX "ScoutingPlayer_name_idx" ON "public"."ScoutingPlayer"("name");

-- CreateIndex
CREATE INDEX "ScoutingPlayer_team_idx" ON "public"."ScoutingPlayer"("team");

-- CreateIndex
CREATE INDEX "ScoutingPlayer_region_idx" ON "public"."ScoutingPlayer"("region");
