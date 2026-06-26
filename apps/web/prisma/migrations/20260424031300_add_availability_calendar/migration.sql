-- CreateEnum
CREATE TYPE "public"."AvailabilityIntervalType" AS ENUM ('WEEKLY');

-- CreateTable
CREATE TABLE "public"."TeamAvailabilitySettings" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "intervalType" "public"."AvailabilityIntervalType" NOT NULL DEFAULT 'WEEKLY',
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "hoursStart" INTEGER NOT NULL DEFAULT 12,
    "hoursEnd" INTEGER NOT NULL DEFAULT 24,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "weekStartsOn" INTEGER NOT NULL DEFAULT 0,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderDayOfWeek" INTEGER NOT NULL DEFAULT 0,
    "reminderHour" INTEGER NOT NULL DEFAULT 12,
    "reminderMinute" INTEGER NOT NULL DEFAULT 0,
    "reminderRoleId" TEXT,
    "reminderGuildId" TEXT,
    "reminderChannelId" TEXT,
    "lastReminderFiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamAvailabilitySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AvailabilitySchedule" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AvailabilityResponse" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "userId" TEXT,
    "passwordHash" TEXT,
    "slots" INTEGER[],
    "submittedFromTz" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamAvailabilitySettings_teamId_key" ON "public"."TeamAvailabilitySettings"("teamId");

-- CreateIndex
CREATE INDEX "AvailabilitySchedule_teamId_idx" ON "public"."AvailabilitySchedule"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilitySchedule_teamId_weekStart_key" ON "public"."AvailabilitySchedule"("teamId", "weekStart");

-- CreateIndex
CREATE INDEX "AvailabilityResponse_scheduleId_idx" ON "public"."AvailabilityResponse"("scheduleId");

-- CreateIndex
CREATE INDEX "AvailabilityResponse_userId_idx" ON "public"."AvailabilityResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityResponse_scheduleId_nameKey_key" ON "public"."AvailabilityResponse"("scheduleId", "nameKey");

-- AddForeignKey
ALTER TABLE "public"."TeamAvailabilitySettings" ADD CONSTRAINT "TeamAvailabilitySettings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AvailabilitySchedule" ADD CONSTRAINT "AvailabilitySchedule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AvailabilityResponse" ADD CONSTRAINT "AvailabilityResponse_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."AvailabilitySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AvailabilityResponse" ADD CONSTRAINT "AvailabilityResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
