-- CreateTable
CREATE TABLE "public"."BotApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "BotApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BotWebhookSubscription" (
    "id" TEXT NOT NULL,
    "botApiKeyId" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotWebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotApiKey_key_key" ON "public"."BotApiKey"("key");

-- CreateIndex
CREATE INDEX "BotApiKey_key_idx" ON "public"."BotApiKey"("key");

-- CreateIndex
CREATE INDEX "BotApiKey_guildId_idx" ON "public"."BotApiKey"("guildId");

-- CreateIndex
CREATE INDEX "BotWebhookSubscription_botApiKeyId_idx" ON "public"."BotWebhookSubscription"("botApiKeyId");

-- CreateIndex
CREATE INDEX "BotWebhookSubscription_teamId_idx" ON "public"."BotWebhookSubscription"("teamId");

-- AddForeignKey
ALTER TABLE "public"."BotWebhookSubscription" ADD CONSTRAINT "BotWebhookSubscription_botApiKeyId_fkey" FOREIGN KEY ("botApiKeyId") REFERENCES "public"."BotApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BotWebhookSubscription" ADD CONSTRAINT "BotWebhookSubscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
