-- CreateEnum
CREATE TYPE "public"."UsageEnv" AS ENUM ('PRODUCTION', 'PREVIEW', 'DEVELOPMENT');

-- CreateEnum
CREATE TYPE "public"."UsageSource" AS ENUM ('SERVER', 'CLIENT');

-- CreateTable
CREATE TABLE "public"."DailyFeatureRollup" (
    "environment" "public"."UsageEnv" NOT NULL,
    "day" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uniqueUsers" INTEGER NOT NULL,
    "uniqueTeams" INTEGER NOT NULL,
    "totalEvents" INTEGER NOT NULL,

    CONSTRAINT "DailyFeatureRollup_pkey" PRIMARY KEY ("environment","day","name")
);

-- CreateTable
CREATE TABLE "public"."DailyPageRollup" (
    "environment" "public"."UsageEnv" NOT NULL,
    "day" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "views" INTEGER NOT NULL,
    "uniqueUsers" INTEGER NOT NULL,

    CONSTRAINT "DailyPageRollup_pkey" PRIMARY KEY ("environment","day","path")
);

-- CreateTable
CREATE TABLE "public"."UsageEvent" (
    "id" BIGSERIAL NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "source" "public"."UsageSource" NOT NULL,
    "environment" "public"."UsageEnv" NOT NULL,
    "userId" TEXT,
    "teamId" INTEGER,
    "path" TEXT,
    "sessionId" TEXT,
    "props" JSONB,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserActiveDay" (
    "environment" "public"."UsageEnv" NOT NULL,
    "day" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserActiveDay_pkey" PRIMARY KEY ("environment","day","userId")
);

-- CreateIndex
CREATE INDEX "UsageEvent_environment_name_ts_idx" ON "public"."UsageEvent"("environment" ASC, "name" ASC, "ts" ASC);

-- CreateIndex
CREATE INDEX "UsageEvent_environment_path_ts_idx" ON "public"."UsageEvent"("environment" ASC, "path" ASC, "ts" ASC);

-- CreateIndex
CREATE INDEX "UsageEvent_ts_idx" ON "public"."UsageEvent"("ts" ASC);

-- CreateIndex
CREATE INDEX "UsageEvent_userId_ts_idx" ON "public"."UsageEvent"("userId" ASC, "ts" ASC);

