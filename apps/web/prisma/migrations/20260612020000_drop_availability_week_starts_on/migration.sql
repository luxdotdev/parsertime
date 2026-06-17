-- Drop the unused weekStartsOn column from TeamAvailabilitySettings.
ALTER TABLE "public"."TeamAvailabilitySettings" DROP COLUMN "weekStartsOn";
