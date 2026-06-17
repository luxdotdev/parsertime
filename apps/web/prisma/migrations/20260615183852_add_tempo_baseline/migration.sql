-- CreateEnum
CREATE TYPE "TempoMetric" AS ENUM ('FIGHT_DURATION', 'ULT_CHARGE_TIME', 'ULT_HOLD_TIME');

-- CreateTable
CREATE TABLE "TempoBaseline" (
    "metric" "TempoMetric" NOT NULL,
    "mean" DOUBLE PRECISION NOT NULL,
    "stdDev" DOUBLE PRECISION NOT NULL,
    "sampleN" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TempoBaseline_pkey" PRIMARY KEY ("metric")
);
