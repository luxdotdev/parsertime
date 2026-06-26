## Internationalization

The Next.js app uses `next-intl` for internationalization, with `en.json`, `ko.json`, and `zh.json` files living at `apps/web/messages`. When building user-facing components, make sure to include proper translation support.

## Pre-commit Checks

Before committing, ensure that changes are formatted, linted, typechecked, and pass the test suite.

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
