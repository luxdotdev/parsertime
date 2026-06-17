/*
  Warnings:

  - You are about to drop the `BotApiKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BotWebhookSubscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."BotWebhookSubscription" DROP CONSTRAINT "BotWebhookSubscription_botApiKeyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BotWebhookSubscription" DROP CONSTRAINT "BotWebhookSubscription_teamId_fkey";

-- DropTable
DROP TABLE "public"."BotApiKey";

-- DropTable
DROP TABLE "public"."BotWebhookSubscription";

-- CreateTable
CREATE TABLE "public"."BotNotificationConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "teamIds" INTEGER[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotNotificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotNotificationConfig_createdBy_idx" ON "public"."BotNotificationConfig"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "BotNotificationConfig_guildId_channelId_key" ON "public"."BotNotificationConfig"("guildId", "channelId");

-- AddForeignKey
ALTER TABLE "public"."BotNotificationConfig" ADD CONSTRAINT "BotNotificationConfig_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
