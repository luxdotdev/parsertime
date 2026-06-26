-- CreateEnum
CREATE TYPE "public"."ColorblindMode" AS ENUM ('OFF', 'DEUTERANOPIA', 'PROTANOPIA', 'TRITANOPIA');

-- CreateTable
CREATE TABLE "public"."AppSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "colorblindMode" "public"."ColorblindMode" NOT NULL DEFAULT 'OFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppSettings_userId_idx" ON "public"."AppSettings"("userId");

-- AddForeignKey
ALTER TABLE "public"."AppSettings" ADD CONSTRAINT "AppSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
