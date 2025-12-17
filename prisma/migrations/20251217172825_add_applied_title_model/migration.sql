-- CreateTable
CREATE TABLE "public"."AppliedTitle" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "title" "public"."Title" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppliedTitle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppliedTitle_userId_idx" ON "public"."AppliedTitle"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppliedTitle_userId_title_key" ON "public"."AppliedTitle"("userId", "title");

-- AddForeignKey
ALTER TABLE "public"."AppliedTitle" ADD CONSTRAINT "AppliedTitle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
