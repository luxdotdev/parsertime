-- CreateTable
CREATE TABLE "public"."MapGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "teamId" INTEGER NOT NULL,
    "mapIds" INTEGER[],
    "category" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapGroup_teamId_idx" ON "public"."MapGroup"("teamId");

-- CreateIndex
CREATE INDEX "MapGroup_createdBy_idx" ON "public"."MapGroup"("createdBy");

-- AddForeignKey
ALTER TABLE "public"."MapGroup" ADD CONSTRAINT "MapGroup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MapGroup" ADD CONSTRAINT "MapGroup_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
