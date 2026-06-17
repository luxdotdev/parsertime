-- CreateEnum
CREATE TYPE "FaceitRole" AS ENUM ('TANK', 'DAMAGE', 'SUPPORT');

-- CreateTable
CREATE TABLE "PlayerFsr" (
    "faceitPlayerId" TEXT NOT NULL,
    "role" "FaceitRole" NOT NULL,
    "fsr" INTEGER NOT NULL,
    "compositeZ" DOUBLE PRECISION NOT NULL,
    "effectiveAnchor" INTEGER NOT NULL,
    "mapCount" INTEGER NOT NULL,
    "recentMapCount365d" INTEGER NOT NULL,
    "tiersPlayed" "FaceitTier"[],
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerFsr_pkey" PRIMARY KEY ("faceitPlayerId","role")
);

-- CreateTable
CREATE TABLE "PlayerFsrTier" (
    "faceitPlayerId" TEXT NOT NULL,
    "role" "FaceitRole" NOT NULL,
    "tier" "FaceitTier" NOT NULL,
    "fsr" INTEGER NOT NULL,
    "compositeZ" DOUBLE PRECISION NOT NULL,
    "mapCount" INTEGER NOT NULL,
    "minutesPlayed" DOUBLE PRECISION NOT NULL,
    "peerCount" INTEGER NOT NULL,
    "statZ" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerFsrTier_pkey" PRIMARY KEY ("faceitPlayerId","role","tier")
);

-- CreateTable
CREATE TABLE "FsrBaseline" (
    "tier" "FaceitTier" NOT NULL,
    "role" "FaceitRole" NOT NULL,
    "sampleN" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FsrBaseline_pkey" PRIMARY KEY ("tier","role")
);

-- CreateIndex
CREATE INDEX "PlayerFsr_role_fsr_idx" ON "PlayerFsr"("role", "fsr");

-- CreateIndex
CREATE INDEX "PlayerFsrTier_tier_role_fsr_idx" ON "PlayerFsrTier"("tier", "role", "fsr");

-- AddForeignKey
ALTER TABLE "PlayerFsr" ADD CONSTRAINT "PlayerFsr_faceitPlayerId_fkey" FOREIGN KEY ("faceitPlayerId") REFERENCES "FaceitPlayer"("faceitPlayerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerFsrTier" ADD CONSTRAINT "PlayerFsrTier_faceitPlayerId_fkey" FOREIGN KEY ("faceitPlayerId") REFERENCES "FaceitPlayer"("faceitPlayerId") ON DELETE CASCADE ON UPDATE CASCADE;
