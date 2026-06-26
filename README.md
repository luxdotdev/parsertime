# Parsertime

<p align="center">
  <a href="https://parsertime.app/">
    <img src="https://parsertime.app/icon.png" height="96">
    <h3 align="center">Parsertime</h3>
  </a>
</p>

[![Website](https://img.shields.io/website?style=for-the-badge&labelColor=000&up_message=Operational&url=https%3A%2F%2Fparsertime.app)](https://parsertime.app)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/lucasdoell/parsertime/vitest.yml?style=for-the-badge&label=Tests&labelColor=000)
![GitHub Repo stars](https://img.shields.io/github/stars/lucasdoell/parsertime?style=for-the-badge&labelColor=000)

Parsertime turns raw Overwatch 2 Workshop logs into per-player stats, hero skill
ratings, trend lines, and team breakdowns — usually within minutes of a scrim
ending. It's built for the gap between when the scrim ends and when VOD review
starts: upload your logs, get a dashboard, and walk into review already knowing
what to look at.

It's used by collegiate, amateur, and competitive Overwatch teams to track
performance, scout opponents, coordinate practice, and find scrim partners.

📚 Full product documentation lives at **[docs.parsertime.app](https://docs.parsertime.app)**.

## How it works

In Overwatch 2, enable _Gameplay → Enable Workshop Inspector Log File_ and host
your scrim using Parsertime's [ScrimTime workshop code](https://workshop.codes/DKEEH).
The Workshop writes per-map log files to your `Documents/Overwatch/Workshop`
folder. Upload those logs to Parsertime and it parses them into a structured,
queryable dataset — eliminations, deaths, damage, healing, ultimates, positions,
and more — that powers everything below.

## Features

### Scrims & match analysis

- **Scrim & map breakdowns** — Upload a scrim's logs and get per-map overviews:
  final score, match time, hero damage, healing, and a full per-player stats
  table, plus an analysis section (first-death rate, ult value, and more).
- **Map winner detection** — Each map card shows who won at a glance, including
  an approximation for Push maps, where the Workshop doesn't record a score.
- **Map comparison & groups** — Build cross-map comparisons (`/[team]/compare`,
  `/[team]/map-groups`) to analyze your team against an opponent or across
  several scrims at once.
- **Killfeed, heatmaps & replay** — Positional visualizations of fights and
  movement (positional/heatmap/replay views are paid-tier features).

### Dashboards & team stats

- **Recent-activity dashboard** — Your home base after sign-in: a collapsible
  overview band (win rate, maps logged, Team TSR, best map) over a paginated
  scrim list, scoped by a team switcher.
- **Team stats** — A multi-tab analytics dashboard (Overview, Performance,
  Heroes, Trends, Maps, Teamfights, and more) that renders once a team has at
  least two scrims uploaded.

### Skill ratings

Two independent rating systems live side by side at the **`/leaderboard`** hub:

- **CSR — Composite Skill Rating** (`/leaderboard/csr`) — A per-hero rating
  derived from your statistical performance versus the average player, normalized
  per 10 minutes with role-aware stat weighting.
- **TSR — Tournament Skill Rating** (`/leaderboard/tsr`) — A per-player rating
  derived from tournament and scrim outcomes. The team-level aggregate
  (**Team TSR**) drives matchmaking brackets.

### AI Analyst chat

A conversational assistant (`/chat`) that answers natural-language questions
about your scrim data ("how did we do on Ilios last week?") with grounded,
card-backed answers. Metered against a prepaid **credit balance** with optional
auto-refill — no subscription required.

### Matchmaker

`/matchmaker` pairs teams by Team TSR bracket and region, then ferries scrim
requests to the other team's Discord through the Parsertime bot — built to close
the gap between "we need a scrim Thursday" and "we have one on the calendar."

### Coaching Canvas

A full-screen map workspace (`/coaching/canvas`) for drawing up plays: a freehand
drawing surface with pen, circle, and eraser tools plus draggable, team-colored
hero tokens. Drawing is free; importing real positional data from a scrim is a
paid feature.

### Availability Calendar

A weekly heat-grid scheduler that helps a roster find practice time everyone can
make. Owners configure granularity, time window, and timezone; players click
their available slots and overlap shades in automatically.

### Ranked tracker

`/ranked` is a personal, team-independent competitive dashboard. Log or import
your ranked games and get win rates, trends, and hero/role breakdowns, with
patch- and season-aware filtering. Private by default; available to every
signed-in user.

### Tournaments

Create and manage tournaments (`/tournaments`) with per-match views and
team-scoped tournament stats.

### Discord bot

A free bot for every team that brings scrim data and availability workflows into
Discord — player profiles, stat comparisons, team winrates, weekly availability
reminders, and new-scrim announcements, all without leaving the server.

### Scouting _(experimental, flag-gated)_

- **OWCS scouting** (`/scouting`) — Search OWCS teams and players and view
  profiles with recent match history.
- **FACEIT scouting** (`/faceit`) — FACEIT team and player scouting, with profiles
  built from FACEIT match data.

### Advanced analytics _(experimental, flag-gated)_

- **Win probability** — Per-mode gradient-boosted models surface live win-
  probability analysis on scrim and map views.
- **Fight initiation** — "Going first" detection and initiation win-rate stats
  on supported (modern-log) maps.
- **Team ops** (`/[team]/ops`) — An opponent blacklist with match-based
  suggestions and a post-scrim feedback log.
- **Query builder** (`/query`) — Team-scoped custom queries over your match data
  (Premium).

## Plans

Parsertime is free to start. Paid tiers (managed via Stripe) raise team and
member limits, extend data retention, and unlock advanced tooling.

| Tier        | Highlights                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------- |
| **Free**    | Scrims, dashboards, skill ratings, AI Analyst (credit-based), Coaching Canvas, Ranked tracker.  |
| **Basic**   | More teams & members, positional data, tempo charts, extended stats history, priority support.  |
| **Premium** | Unlimited teams & members, full history with custom date ranges, scouting, query builder, more. |

See the [pricing page](https://parsertime.app/pricing) for the current breakdown.

## What's inside?

This is a [Turborepo](https://turborepo.com/) monorepo managed with [pnpm](https://pnpm.io/) workspaces. It contains three deployable services:

| Path        | Package           | Description                                                            | Deploy  |
| ----------- | ----------------- | --------------------------------------------------------------------- | ------- |
| `apps/web`  | `parsertime`      | The web platform — Next.js, Tailwind CSS, Prisma, Postgres.           | Vercel  |
| `apps/docs` | `parsertime-docs` | The documentation site — Next.js + [fumadocs](https://fumadocs.dev/). | Vercel  |
| `apps/bot`  | `parsertime-bot`  | The Discord bot — [discord.js](https://discord.js.org/), runs on Bun. | Railway |

Shared packages live under `packages/`:

| Path                     | Package                     | Description                                                                                    |
| ------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------- |
| `packages/lint-config`   | `@parsertime/lint-config`   | Shared oxlint + oxfmt config for every app.                                                     |
| `packages/transactional` | `@parsertime/transactional` | Transactional email templates — [React Email](https://react.email/), consumed by the web app.  |

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui + Radix, TanStack Query & Table
- **Backend**: Next.js Route Handlers & Server Actions on Vercel, [Effect](https://effect.website/) for the functional core, Prisma 7 ORM
- **Auth & billing**: Better Auth, Stripe (subscriptions + AI credits)
- **AI**: [AI SDK](https://ai-sdk.dev/) for the Analyst chat
- **Data**: Vercel Postgres (Neon), Upstash Redis, Vercel KV / Blob / Edge Config
- **Email**: React Email templates rendered and sent via AWS SES / SendGrid
- **Feature flags**: Vercel Flags SDK
- **Observability**: Axiom + OpenTelemetry
- **Tooling**: Turborepo, pnpm, Vitest, oxlint, oxfmt
- **Bot**: discord.js on Bun (Railway); **Docs**: fumadocs (Vercel)

## Getting Started

1. Clone the repository:
   ```sh
   git clone https://github.com/luxdotdev/parsertime.git
   ```
2. Install dependencies for every workspace from the repo root:
   ```sh
   pnpm install
   ```
3. Set up your environment variables. Each app reads its own env file (e.g. `apps/web/.env` based on `apps/web/.env.example`).

4. Run the dev servers (Turborepo runs each app's `dev` task):
   ```bash
   pnpm dev
   ```
   To run a single app: `pnpm --filter parsertime dev` (web), `--filter parsertime-docs`, or `--filter parsertime-bot`.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the web app.

Common root scripts delegate to Turborepo across all packages: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format`.

## Useful Links

- [Documentation](https://docs.parsertime.app)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)
- [Vercel](https://vercel.com/)

## Contributors

<a href="https://github.com/luxdotdev/parsertime/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=luxdotdev/parsertime" />
</a>

Thanks to all the contributors who have helped make Parsertime better!
