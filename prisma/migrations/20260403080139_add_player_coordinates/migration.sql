-- AlterTable
ALTER TABLE "public"."Ability1Used" ADD COLUMN     "player_x" DOUBLE PRECISION,
ADD COLUMN     "player_y" DOUBLE PRECISION,
ADD COLUMN     "player_z" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."Ability2Used" ADD COLUMN     "player_x" DOUBLE PRECISION,
ADD COLUMN     "player_y" DOUBLE PRECISION,
ADD COLUMN     "player_z" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."Damage" ADD COLUMN     "attacker_x" DOUBLE PRECISION,
ADD COLUMN     "attacker_y" DOUBLE PRECISION,
ADD COLUMN     "attacker_z" DOUBLE PRECISION,
ADD COLUMN     "victim_x" DOUBLE PRECISION,
ADD COLUMN     "victim_y" DOUBLE PRECISION,
ADD COLUMN     "victim_z" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."Healing" ADD COLUMN     "healee_x" DOUBLE PRECISION,
ADD COLUMN     "healee_y" DOUBLE PRECISION,
ADD COLUMN     "healee_z" DOUBLE PRECISION,
ADD COLUMN     "healer_x" DOUBLE PRECISION,
ADD COLUMN     "healer_y" DOUBLE PRECISION,
ADD COLUMN     "healer_z" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."Kill" ADD COLUMN     "attacker_x" DOUBLE PRECISION,
ADD COLUMN     "attacker_y" DOUBLE PRECISION,
ADD COLUMN     "attacker_z" DOUBLE PRECISION,
ADD COLUMN     "victim_x" DOUBLE PRECISION,
ADD COLUMN     "victim_y" DOUBLE PRECISION,
ADD COLUMN     "victim_z" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."UltimateEnd" ADD COLUMN     "player_x" DOUBLE PRECISION,
ADD COLUMN     "player_y" DOUBLE PRECISION,
ADD COLUMN     "player_z" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."UltimateStart" ADD COLUMN     "player_x" DOUBLE PRECISION,
ADD COLUMN     "player_y" DOUBLE PRECISION,
ADD COLUMN     "player_z" DOUBLE PRECISION;
