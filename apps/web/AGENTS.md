## Internationalization

The Next.js app uses `next-intl` for internationalization, with `en.json`, `ko.json`, and `zh.json` files living at `apps/web/messages`. When building user-facing components, make sure to include proper translation support.

## Pre-commit Checks

Before committing, ensure that changes are formatted, linted, typechecked, and pass the test suite.

## Cache Components (Cache Components / PPR is enabled)

`cacheComponents: true` + `partialPrefetching: true` are on. PPR prerenders every request **twice** (a cache-warming pass, then the final prerender), so two rules prevent the recurring `HANGING_PROMISE_REJECTION` (`dynamic "use cache"`) and `Unexpected cache miss after cache warming phase` errors:

1. **`use cache` inputs must be deterministic across passes.** A cached function's arguments (and closure values) become its cache key. Only pass route params, scalar DB columns, or **fixed-order** constant arrays. Never pass:
   - a raw `findFirst`/`findMany` result — add an explicit `orderBy` (an unordered query can return a different row/order between passes; e.g. `resolveScrimMapDataId`, flag `identify`'s team `idArray`).
   - a `Set`→array, `Object.keys/values/entries`, or any array whose order isn't pinned.
   - a `new Date()`/`Date.now()`/`Math.random()` value — quantize it (e.g. day-align, like `computeDateRange`) or don't key on it.

2. **Reads that reach `use cache` in a layout's static-shell region must be request-time.** `@vercel/edge-config`'s `get()` and every feature flag (`@/lib/flags`) compile to `use cache`. If such a read runs outside a page's dynamic boundary (e.g. in the `Footer`/a `layout.tsx`) without already being request-time, add `await connection()` as the first line (see `AuthedAppHeader`, `Footer`, the team-stats layout). Note: awaiting `getTranslations`/`getLocale` does **not** defer — only `connection()`/`headers()`/`cookies()`/`auth()` do.

These surface only at request time on real `[param]` routes (not `next build`); check Vercel runtime logs after deploying cache-touching changes.

## Agent skills

### Issue tracker

GitHub issues at `luxdotdev/parsertime` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical defaults (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`); only `wontfix` exists today, the rest are created on first use. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root (created lazily by `/grill-with-docs`). See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

**Keep this block, including in commits.** It is part of the project's agent setup, maintained by `next dev` for every agent that works here. If it appears as an uncommitted change, that is intentional — commit it as-is. Do not remove it to clean up a diff; it will be regenerated.
<!-- END:nextjs-agent-rules -->
