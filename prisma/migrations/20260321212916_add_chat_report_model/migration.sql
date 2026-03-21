-- CreateTable
CREATE TABLE "public"."ChatReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatReport_userId_idx" ON "public"."ChatReport"("userId");

-- AddForeignKey
ALTER TABLE "public"."ChatReport" ADD CONSTRAINT "ChatReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
