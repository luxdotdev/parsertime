-- CreateIndex
CREATE INDEX "Scrim_teamId_opponentTeamId_idx" ON "public"."Scrim"("teamId", "opponentTeamId");

-- CreateIndex
CREATE INDEX "ScrimFeedback_createdBy_idx" ON "public"."ScrimFeedback"("createdBy");

-- CreateIndex
CREATE INDEX "TeamBlacklist_createdBy_idx" ON "public"."TeamBlacklist"("createdBy");
