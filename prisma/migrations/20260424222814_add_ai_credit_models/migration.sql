-- CreateEnum
CREATE TYPE "public"."CreditTransactionType" AS ENUM ('TOPUP', 'AUTO_REFILL', 'CHARGE', 'REFUND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "public"."UserCredits" (
    "userId" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "autoRefillEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoRefillThresholdCents" INTEGER NOT NULL DEFAULT 200,
    "autoRefillAmountCents" INTEGER NOT NULL DEFAULT 1000,
    "stripePaymentMethodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredits_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."CreditTransaction" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."CreditTransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "balanceAfterCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "stripeEventId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PendingAutoRefill" (
    "userId" TEXT NOT NULL,
    "stripeIdempotencyKey" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingAutoRefill_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_stripeEventId_key" ON "public"."CreditTransaction"("stripeEventId");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "public"."CreditTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PendingAutoRefill_stripeIdempotencyKey_key" ON "public"."PendingAutoRefill"("stripeIdempotencyKey");

-- AddForeignKey
ALTER TABLE "public"."UserCredits" ADD CONSTRAINT "UserCredits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PendingAutoRefill" ADD CONSTRAINT "PendingAutoRefill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
