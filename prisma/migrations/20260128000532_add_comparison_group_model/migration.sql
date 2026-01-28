-- CreateTable
CREATE TABLE "public"."ComparisonGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "teamId" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "heroes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mapIds" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComparisonGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComparisonGroup_teamId_idx" ON "public"."ComparisonGroup"("teamId");

-- CreateIndex
CREATE INDEX "ComparisonGroup_createdBy_idx" ON "public"."ComparisonGroup"("createdBy");

-- CreateIndex
CREATE INDEX "ComparisonGroup_teamId_playerName_idx" ON "public"."ComparisonGroup"("teamId", "playerName");

-- AddForeignKey
ALTER TABLE "public"."ComparisonGroup" ADD CONSTRAINT "ComparisonGroup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComparisonGroup" ADD CONSTRAINT "ComparisonGroup_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
