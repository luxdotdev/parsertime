## Internationalization

The Next.js app uses `next-intl` for internationalization, with `en.json`, `ko.json`, and `zh.json` files living at `apps/web/messages`. When building user-facing components, make sure to include proper translation support.

## Pre-commit Checks

Before committing, ensure that changes are formatted, linted, typechecked, and pass the test suite.

## Cache Components (Cache Components / PPR is enabled)

`cacheComponents: true` + `partialPrefetching: true` are on. PPR prerenders every request **twice** (a cache-warming pass, then the final prerender), so four rules prevent the recurring `HANGING_PROMISE_REJECTION` (`dynamic "use cache"`) and `Unexpected cache miss after cache warming phase` errors:

1. **`use cache` inputs must be deterministic across passes.** A cached function's arguments (and closure values) become its cache key. Only pass route params, scalar DB columns, or **fixed-order** constant arrays. Never pass:
   - a raw `findFirst`/`findMany` result — add an explicit `orderBy` (an unordered query can return a different row/order between passes; e.g. `resolveScrimMapDataId`, flag `identify`'s team `idArray`).
   - a `Set`→array, `Object.keys/values/entries`, or any array whose order isn't pinned.
   - a `new Date()`/`Date.now()`/`Math.random()` value — quantize it (e.g. day-align, like `computeDateRange`) or don't key on it.

2. **Reads that reach `use cache` in a layout's static-shell region must be request-time.** `@vercel/edge-config`'s `get()` and every feature flag (`@/lib/flags`) compile to `use cache`. If such a read runs outside a page's dynamic boundary (e.g. in the `Footer`/a `layout.tsx`) without already being request-time, add `await connection()` as the first line (see `AuthedAppHeader`, `Footer`, the team-stats layout). Note: awaiting `getTranslations`/`getLocale` does **not** defer — only `connection()`/`headers()`/`cookies()`/`auth()` do.

3. **Flag reads in render code must use the precomputed code.** `proxy.ts` evaluates all `pageFlags` once per request and forwards a signed code on the `x-flags-code` request header; pages/layouts/server components MUST read flags via `getFlag`/`getAllFlags` (`@/lib/flags-helpers`), never by calling the flag function directly. A live flag call can transiently fail and silently fall back to `defaultValue` in only one of the two prerender passes — the passes then disagree about *which* `use cache` calls run, which is the classic cause of `HANGING_PROMISE_REJECTION`. Route handlers and server actions (never prerendered) still call flags live (`resolveAllFlags` or the flag itself). New flags must be appended to `pageFlags` in `src/lib/flags-precompute.ts`.

4. **The static shell must stay request-free — providers hydrate via islands, fallbacks are sync.** The root layout's provider tree is prerendered; request-derived values (locale override, flags, session extras) stream in as Suspense islands that hydrate stateful client providers (`IntlProvider`/`FeatureFlagsProvider`/`BrandThemeProvider` + their `*Hydrator` components in `layout.tsx`). Consequences:
   - `loading.tsx` and Suspense fallbacks must be synchronous and cookie-free. For translated text in them use `getStaticTranslations` (`@/lib/metadata-i18n`) — `getTranslations` reads the LOCALE cookie and forces the shell dynamic. Same for client components that prerender: `useTranslations` works because the intl provider carries the default-locale catalog (plus explicit `timeZone`) — never remove those props or next-intl "environment-falls-back" into `cookies()`.
   - A client provider above `{children}` must not read request data (`useSearchParams`, cookies): hold state and sync via a Suspense-wrapped child (see `TeamSwitcherProvider`).
   - Prefer ONE content boundary per page whose fallback mirrors the real content's own pending layout (see `/dashboard`'s `ScrimListSkeleton` mirroring `ScrimPagination`), instead of stacking route `loading.tsx` + layout skeleton + component skeletons — that's what causes multi-skeleton flashing.
   - Page chrome (`DashboardLayout`/`AppHeader`) must render exactly once, in the page's static shell — never in both a `loading.tsx` and the page (the fallback→content swap remounts it and re-suspends the header), and never below a layout-level auth gate. Auth gates are the FIRST step of the page's Suspense-wrapped content component (`isAuthedToViewScrim`/`isAuthedToViewMap` → `<NoAuthCard />`, see the `[scrimId]` routes), so they resolve inside the page's single skeleton. Chrome that needs param-derived request data takes a thunk resolved inside the streamed header (`DashboardLayout`'s `guestModeSource`).

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
