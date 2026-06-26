-- Migrate the next-auth (Auth.js) auth tables to the Better Auth core schema.
--
-- This migration is written to preserve data in environments that already hold
-- next-auth rows (e.g. production): it RENAMES columns rather than dropping
-- them, converts `User.emailVerified` from a timestamp to a boolean, and
-- converts the unix `Account.expires_at` to a timestamp. The staging branch at
-- us-east-5 was empty and was provisioned directly from the current schema, so
-- it does not run this file.

-- Account: rename to Better Auth column names, convert types, add columns.
ALTER TABLE "Account" RENAME COLUMN "provider" TO "providerId";
ALTER TABLE "Account" RENAME COLUMN "providerAccountId" TO "accountId";
ALTER TABLE "Account" RENAME COLUMN "refresh_token" TO "refreshToken";
ALTER TABLE "Account" RENAME COLUMN "access_token" TO "accessToken";
ALTER TABLE "Account" RENAME COLUMN "id_token" TO "idToken";

ALTER TABLE "Account" ADD COLUMN "accessTokenExpiresAt" TIMESTAMP(3);
UPDATE "Account"
  SET "accessTokenExpiresAt" = to_timestamp("expires_at") AT TIME ZONE 'UTC'
  WHERE "expires_at" IS NOT NULL;
ALTER TABLE "Account" ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN "password" TEXT;
ALTER TABLE "Account" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Account" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Account" DROP COLUMN "type";
ALTER TABLE "Account" DROP COLUMN "token_type";
ALTER TABLE "Account" DROP COLUMN "session_state";
ALTER TABLE "Account" DROP COLUMN "expires_at";

ALTER INDEX IF EXISTS "Account_provider_providerAccountId_key"
  RENAME TO "Account_providerId_accountId_key";

-- Session: rename + add Better Auth columns.
ALTER TABLE "Session" RENAME COLUMN "sessionToken" TO "token";
ALTER TABLE "Session" RENAME COLUMN "expires" TO "expiresAt";
ALTER TABLE "Session" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "Session" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "Session" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Session" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER INDEX IF EXISTS "Session_sessionToken_key" RENAME TO "Session_token_key";

-- User: emailVerified timestamp -> boolean (a non-null timestamp meant verified).
ALTER TABLE "User" ALTER COLUMN "emailVerified" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "emailVerified" TYPE BOOLEAN
  USING ("emailVerified" IS NOT NULL);
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET DEFAULT false;

-- VerificationToken -> Verification (different shape; the old table only backed
-- the impersonation flow, which now uses the Better Auth magic-link format).
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");
DROP TABLE "VerificationToken";

-- Admin plugin fields (impersonation + user ban management). `role` already
-- exists; these are the remaining columns the plugin reads/writes.
ALTER TABLE "User" ADD COLUMN "banned" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN "banReason" TEXT;
ALTER TABLE "User" ADD COLUMN "banExpires" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "impersonatedBy" TEXT;
