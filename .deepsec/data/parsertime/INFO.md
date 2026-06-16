# parsertime

## What this codebase does

Parsertime is a Next.js 16 App Router app for collegiate Overwatch teams to
track scrims, maps, player stats, tournaments, scouting, matchmaker requests,
availability, notifications, and AI chat insights. It is TypeScript/React with
Prisma on Postgres, NextAuth, Vercel KV/Blob/Edge Config, Stripe billing and AI
credits, Axiom telemetry, Discord bot integrations, FACEIT ingest, and server
route handlers under `src/app/api`.

## Auth shape

- NextAuth is configured in `src/lib/auth.ts`; route handlers and server pages
  normally call `auth()` and then resolve the app user through `UserService`
  with `AppRuntime.runPromise`.
- Role and plan checks use `$Enums.UserRole.ADMIN` / `UserRole.ADMIN` and the
  `Permission` / `check` helpers for feature gates such as `create-team`,
  `create-scrim`, and stats timeframe access.
- Team/scrim/map access is project-specific: use `isAuthedToViewTeam`,
  `isTeamOwnerOrManager`, `isAuthedToViewScrim`, `isAuthedToViewMap`, or
  explicit owner/manager/member checks against Prisma.
- Machine endpoints use non-session auth: `authenticateBotSecret`,
  `resolveDiscordUser`, `verifyTeamAccess`, local cron secret checks, Stripe
  webhook signatures, and FACEIT HMAC signatures.
- `guestMode` is an intentional sharing path for scrims and some `/team`
  layouts; it should not imply general team membership or write access.

## Threat model

Highest impact is cross-team or public access to private scrim data, map stats,
player availability, reports, chat history, tournament admin flows, or team
management actions. Next are privilege escalation to admin/manager capabilities,
abuse of Stripe/AI-credit flows, unauthorized Blob/R2 uploads, bot/internal
endpoint abuse via shared secrets, and forged FACEIT/Stripe/cron callbacks.
Public scouting, leaderboard, health, metadata, and guest availability surfaces
exist, but should return only deliberately public or constrained data.

## Project-specific patterns to flag

- Any mutating `src/app/api/**/route.ts` that touches Prisma/services without
  `auth()`, a named auth helper, `authenticateBotSecret`, a cron secret, or a
  verified external webhook signature.
- Team, scrim, map, tournament, comparison, notification, or credit handlers
  that trust a `teamId`, `scrimId`, `mapId`, `userId`, `conversationId`, or
  `scheduleId` from params/body without checking membership, owner/manager
  status, admin role, or the matching session user.
- Admin-only paths under `src/app/settings/admin` and `src/app/api/admin` that
  do not require `UserRole.ADMIN` before search, audit-log, map-calibration, or
  impersonation behavior.
- Upload/presign flows using `handleUpload`, Vercel Blob, R2, avatar/banner
  keys, or map-calibration files that authenticate a user but do not authorize
  ownership/manager/admin access for the target team/user/map.
- DEV_TOKEN/testing-email fallbacks, cron-like destructive routes, bot routes,
  and webhook endpoints that are reachable in production without fail-closed
  secret/signature validation.

## Known false-positives

- `src/app/api/auth/[...nextauth]/route.ts` is intentionally public because
  NextAuth owns the callback/session flow; evaluate `src/lib/auth.ts` instead.
- `src/app/api/stripe/webhooks/route.ts` and
  `src/app/api/faceit/webhook/route.ts` are sessionless by design; the intended
  auth is Stripe signature verification or FACEIT HMAC verification.
- `src/app/api/bot/**` and `src/app/api/internal/availability/**` are machine
  endpoints; `authenticateBotSecret` plus Discord user/team checks are the
  expected auth shape.
- `src/app/api/availability/[scheduleId]/responses/**` allows unauthenticated
  availability submissions for shared schedules, with optional password/name
  ownership semantics.
- Public metadata and read surfaces include `robots.ts`, `sitemap.ts`,
  `manifest.ts`, `.well-known/**`, `api/health`, `api/og`, `api/leaderboard/**`,
  and public scouting/profile/stat pages; do not require `auth()` solely for
  those routes.
