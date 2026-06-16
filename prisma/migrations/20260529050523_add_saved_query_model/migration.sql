-- CreateTable
CREATE TABLE "public"."SavedQuery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "spec" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedQuery_userId_idx" ON "public"."SavedQuery"("userId");

-- CreateIndex
CREATE INDEX "SavedQuery_teamId_idx" ON "public"."SavedQuery"("teamId");
