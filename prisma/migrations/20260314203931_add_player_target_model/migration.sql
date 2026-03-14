-- CreateTable
CREATE TABLE "public"."PlayerTarget" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "playerName" TEXT NOT NULL,
    "stat" TEXT NOT NULL,
    "targetDirection" TEXT NOT NULL,
    "targetPercent" DOUBLE PRECISION NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "scrimWindow" INTEGER NOT NULL DEFAULT 10,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerTarget_teamId_playerName_idx" ON "public"."PlayerTarget"("teamId", "playerName");

-- CreateIndex
CREATE INDEX "PlayerTarget_createdBy_idx" ON "public"."PlayerTarget"("createdBy");

-- AddForeignKey
ALTER TABLE "public"."PlayerTarget" ADD CONSTRAINT "PlayerTarget_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerTarget" ADD CONSTRAINT "PlayerTarget_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
