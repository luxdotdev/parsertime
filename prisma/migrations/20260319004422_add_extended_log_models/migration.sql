-- CreateTable
CREATE TABLE "public"."Ability1Used" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'ability_1_used',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "hero_duplicated" TEXT NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "Ability1Used_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ability2Used" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'ability_2_used',
    "match_time" DOUBLE PRECISION NOT NULL,
    "player_team" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_hero" TEXT NOT NULL,
    "hero_duplicated" TEXT NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "Ability2Used_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Damage" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'damage',
    "match_time" DOUBLE PRECISION NOT NULL,
    "attacker_team" TEXT NOT NULL,
    "attacker_name" TEXT NOT NULL,
    "attacker_hero" TEXT NOT NULL,
    "victim_team" TEXT NOT NULL,
    "victim_name" TEXT NOT NULL,
    "victim_hero" TEXT NOT NULL,
    "event_ability" TEXT NOT NULL,
    "event_damage" INTEGER NOT NULL,
    "is_critical_hit" TEXT NOT NULL,
    "is_environmental" TEXT NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "Damage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Healing" (
    "id" SERIAL NOT NULL,
    "scrimId" INTEGER NOT NULL,
    "event_type" "public"."EventType" NOT NULL DEFAULT 'healing',
    "match_time" DOUBLE PRECISION NOT NULL,
    "healer_team" TEXT NOT NULL,
    "healer_name" TEXT NOT NULL,
    "healer_hero" TEXT NOT NULL,
    "healee_team" TEXT NOT NULL,
    "healee_name" TEXT NOT NULL,
    "healee_hero" TEXT NOT NULL,
    "event_ability" TEXT NOT NULL,
    "event_healing" INTEGER NOT NULL,
    "is_health_pack" TEXT NOT NULL,
    "MapDataId" INTEGER,

    CONSTRAINT "Healing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ability1Used_scrimId_idx" ON "public"."Ability1Used"("scrimId");

-- CreateIndex
CREATE INDEX "Ability1Used_MapDataId_idx" ON "public"."Ability1Used"("MapDataId");

-- CreateIndex
CREATE INDEX "Ability2Used_scrimId_idx" ON "public"."Ability2Used"("scrimId");

-- CreateIndex
CREATE INDEX "Ability2Used_MapDataId_idx" ON "public"."Ability2Used"("MapDataId");

-- CreateIndex
CREATE INDEX "Damage_scrimId_idx" ON "public"."Damage"("scrimId");

-- CreateIndex
CREATE INDEX "Damage_MapDataId_idx" ON "public"."Damage"("MapDataId");

-- CreateIndex
CREATE INDEX "Healing_scrimId_idx" ON "public"."Healing"("scrimId");

-- CreateIndex
CREATE INDEX "Healing_MapDataId_idx" ON "public"."Healing"("MapDataId");

-- AddForeignKey
ALTER TABLE "public"."Ability1Used" ADD CONSTRAINT "Ability1Used_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ability2Used" ADD CONSTRAINT "Ability2Used_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Damage" ADD CONSTRAINT "Damage_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Healing" ADD CONSTRAINT "Healing_MapDataId_fkey" FOREIGN KEY ("MapDataId") REFERENCES "public"."MapData"("id") ON DELETE SET NULL ON UPDATE CASCADE;
