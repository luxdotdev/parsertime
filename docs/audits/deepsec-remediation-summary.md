# DeepSec Remediation Summary

Date: 2026-05-28

This document summarizes the security and bug remediation work completed from the DeepSec findings review. Detailed product and operational tradeoffs are captured separately in `docs/audits/deepsec-remediation-decisions.md`.

## Scope

- Reviewed the DeepSec findings across `HIGH`, `HIGH_BUG`, `MEDIUM`, and `BUG`.
- Fixed true-positive authorization, cross-tenant access, secret exposure, race condition, and correctness issues.
- Treated stale findings as resolved when the current code already contained the intended mitigation.
- Accepted BattleTag self-entry for TSR attribution as a product tradeoff, not a security boundary.

## Security Changes

- Removed legacy development-token bypass behavior from protected mutation paths and made affected routes require authenticated users plus resource-scoped authorization.
- Hardened cron and automation endpoints so scheduled jobs fail closed unless the expected secret is configured and provided.
- Restricted team, scrim, map, stats, tournament, and metadata routes to viewers with explicit access to the underlying resource.
- Bound team invite redemption to the intended invitee email rather than treating invite links as bearer-only capabilities.
- Constrained avatar uploads and map-data lookups to IDs owned by the target team, scrim, or map.
- Prevented pricing-page render from eagerly creating Stripe checkout sessions; checkout and customer portal sessions are now created only through the dedicated route.
- Kept Axiom token-backed logging server-only and removed the browser-exposed secret path.
- Reduced public aggregate leakage by adding thresholds to public hero trend data and bounding chat request/output sizes.
- Added least-privilege `contents: read` permissions to CI workflows.

## Data Integrity And Race Fixes

- Serialized tournament map finalization so concurrent map submissions cannot double-advance or corrupt match state.
- Made grand-final reset creation idempotent with a tournament-scoped advisory transaction lock and an in-transaction reset check.
- Serialized team creation quota checks and writes under an advisory transaction lock.
- Hardened admin map-calibration updates with structured validation.
- Fixed Map ID versus MapData ID confusion in map detail and edit flows.
- Allowed empty hero-assignment submissions to clear stale hero assignments instead of silently preserving old values.
- Made TSR recomputation and TSR breakdown logic agree on roster overrides, and made ingestion skip tracked FACEIT championship matches that omit a competition ID instead of throwing.

## Application Bug Fixes

- Guarded sparse analytics data so missing optional event rows return stable empty or zero values instead of crashing or persisting invalid calculations.
- Made parser handling tolerant of logs without optional kill sections while preserving player-stat rows.
- Sorted tournament-team match results before computing recent form and streaks.
- Grouped scrim-level ability timing and fight timelines per `MapDataId` so fights and ability windows do not merge across maps.
- Mirrored tournament creation constraints in client and server validation so impossible brackets return validation errors rather than generic failures.
- Fixed stale or incorrect calculations in team stats, hero bans, fight grouping, map charts, record-quality, AJAX leaderboard, overview percentages, and simulator context.
- Removed stale simulator role-trio signals that were no longer backed by current data.
- Fixed account deletion and upload/delete callback flows that could fail or perform work in the wrong order.

## Decisions

- BattleTag linking remains user-entered for TSR because verified BattleTag linking is difficult with current data sources and TSR attribution does not rely on BattleTag as an authorization boundary.
- Completed tournament map winner/deletion edits are rejected rather than automatically rolling back bracket state.
- Discord role mentions remain disabled unless tied to a verified bot notification configuration.
- Invite tokens are now email-bound; old unredeemed invite links created under the prior behavior may need to be resent.

## Verification

The final remediation batch passed:

- `./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/oxlint`

The last remediation commits include:

- `a33cb2ea` Harden analytics and tournament reset edges
- `2774400d` Allow clearing hero assignments
- `e631ade8` Bound public trend and chat usage exposure
- `1107985f` Harden admin calibration and team quota writes
- `8a7955a5` Defer pricing checkout creation
- `52cc528f` Protect team stats metadata
- `36b21527` Enforce team target entitlement
- `15fc7ca3` Require cron secret for invite cleanup
- `8af85aaf` Constrain map data route resolution
- `7d31e0de` Serialize tournament map finalization
- `5fbb986d` Bind team invites to invitee email
- `9cd34d0c` Gate data labeling page to admins
- `c0a34ae3` Fail closed on cron and team auth
- `a100c2a6` Harden read-only CI checkout credentials
