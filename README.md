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

This is the repository for Parsertime, a web app written to help collegiate Overwatch players track their performance in scrims.

## What's inside?

This is a [Turborepo](https://turborepo.com/) monorepo managed with [pnpm](https://pnpm.io/) workspaces. It contains three deployable services:

| Path        | Package            | Description                                                                 | Deploy  |
| ----------- | ------------------ | --------------------------------------------------------------------------- | ------- |
| `apps/web`  | `parsertime`       | The web platform — Next.js, Tailwind CSS, Prisma, Postgres.                 | Vercel  |
| `apps/docs` | `parsertime-docs`  | The documentation site — Next.js + [fumadocs](https://fumadocs.dev/).       | Vercel  |
| `apps/bot`  | `parsertime-bot`   | The Discord bot — [discord.js](https://discord.js.org/), runs on Bun.       | Railway |

Shared configuration lives under `packages/`:

| Path                    | Package                   | Description                                  |
| ----------------------- | ------------------------- | -------------------------------------------- |
| `packages/lint-config`  | `@parsertime/lint-config` | Shared oxlint + oxfmt config for every app.  |

The web app is deployed on [Vercel](https://vercel.com/) and uses [Prisma](https://prisma.io) as the ORM over Postgres.

## Features

- **User Accounts**: Users can create personal accounts to manage their data.
- **Team Management**: Allows the creation and management of different teams.
- **Scrim Data Integration**: Users can add scrimmage data using the ScrimTime workshop code.
- **Performance Dashboard**: A comprehensive dashboard presenting various statistics and insights about the user's gameplay.

## Tech Stack

- **Frontend**: Next.js, Tailwind CSS, React Query, shadcn UI
- **Backend**: Serverless Functions, Vercel Edge
- **Tools**: Turborepo, Prisma ORM, Vitest, oxlint, oxfmt
- **Database**: Vercel Postgres (Neon), Upstash Redis, Vercel Blob, Vercel Edge Config
- **Deployment**: Vercel

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

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)
- [Vercel](https://vercel.com/)

## Contributors

<a href="https://github.com/luxdotdev/parsertime/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=luxdotdev/parsertime" />
</a>

Thanks to all the contributors who have helped make Parsertime better!
