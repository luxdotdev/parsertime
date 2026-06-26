-- Keep the oldest settings row per user before enforcing uniqueness.
DELETE FROM "public"."AppSettings" newer
USING "public"."AppSettings" older
WHERE newer."userId" = older."userId"
  AND newer."id" > older."id";

-- Replace the non-unique lookup index with a uniqueness guarantee.
DROP INDEX IF EXISTS "public"."AppSettings_userId_idx";
CREATE UNIQUE INDEX "AppSettings_userId_key" ON "public"."AppSettings"("userId");
