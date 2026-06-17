# Parsertime Monorepo

A Turborepo managed with pnpm workspaces. Three deployable services live under `apps/`.

## Layout

- `apps/web` — Parsertime web platform (Next.js 16, React 19, Prisma 7, Vercel). Has its own `CLAUDE.md`/`AGENTS.md` carrying the Next.js docs index and agent skills — **read those before doing web work.**
- `apps/docs` — Documentation site (Next.js + fumadocs, Vercel).
- `apps/bot` — Discord bot (Bun runtime, discord.js, deployed on Railway). Its HTTP API is consumed by `apps/web` via `apps/web/src/lib/bot-discord-access.ts`; a contract change usually touches both apps.

## Commands (from repo root)

- `pnpm install` — install every workspace (single root lockfile)
- `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test` — delegate to `turbo run` across all packages
- Target one app: `pnpm --filter parsertime <script>` (web), `--filter parsertime-docs`, `--filter parsertime-bot`
- Or via turbo: `turbo run build --filter=parsertime`

## Package manager

pnpm@9.15.9 installs dependencies for all apps. The bot still **runs** on Bun (`bun run index.ts`) on Railway, but its dependencies are installed by pnpm like every other workspace. Workspace-level pnpm config (`overrides`, `onlyBuiltDependencies`) lives in the root `package.json`.

## Deployment

- `apps/web` and `apps/docs` → separate Vercel projects, each with **Root Directory** set to its app folder.
- `apps/bot` → Railway, with **Root Directory** set to `apps/bot`.
