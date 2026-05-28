# DeepSec Remediation Decisions

Date: 2026-05-28

## Decisions

- Removed the legacy `DEV_TOKEN` bypass instead of preserving a compatibility path. The affected mutation routes now require a real authenticated user and resource-scoped authorization.
- Moved Axiom browser logging to a no-op client transport and kept token-backed Axiom transport server-only. This prevents `AXIOM_TOKEN` exposure; browser web-vitals forwarding can be reintroduced later through a server route that validates and scrubs payloads.
- Changed tournament broadcast data from public cacheable output to authenticated, private, no-store output. Tournament creators, admins, and members/managers/owners of linked tournament teams can view it.
- Rejected completed tournament map winner/deletion changes rather than attempting automatic bracket rollback. Correct rollback semantics need an explicit product design before re-enabling historical edits.
- Enforced one `AppSettings` row per user with a deduping migration and unique index, then switched first-read and update paths to upsert by `userId`.
- Disabled raw Discord role mentions in availability reminders until roles can be bound to a verified guild. Reminder guild/channel overrides are only accepted when they match an existing verified bot notification configuration for that team.
- Accepted self-entered BattleTag matching for TSR attribution as a product tradeoff. Verified BattleTag linking remains difficult with the current data sources, so BattleTags continue to be user-editable identity hints for TSR rather than a security boundary.

## Operational Notes

- Deployments need `AXIOM_TOKEN` and `AXIOM_DATASET` server environment variables. The old `NEXT_PUBLIC_AXIOM_TOKEN` and `NEXT_PUBLIC_AXIOM_DATASET` names should not be used for secrets.
- The app-settings migration keeps the oldest duplicate row for each user and deletes newer duplicates before creating the unique index.
