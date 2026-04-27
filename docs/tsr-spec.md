# Parsertime Skill Rating System

This is the working spec, updated based on the dry-run findings against real
FACEIT data. The original v1 spec is preserved in conversation; this document
captures the **current intended algorithm** that the implementation should
follow.

Two distinct ratings live side-by-side:

- **Raw CSR** — the existing per-hero Z-score in `src/lib/hero-rating.ts`.
  Renamed in UI/labels from "CSR" to "Raw CSR". No algorithmic change.
- **TSR** (Tournament Skill Rating) — per-player rating grounded in
  FACEIT-hosted Overwatch 2 tournament results. Aggregates to **Team TSR** for
  scrim matchmaking.

The two are deliberately not coupled. Raw CSR's bias against players who face
elite opponents is exactly why it cannot feed into TSR even as a prior. The
only point of contact is the **predicted-TSR fallback** for unrostered players
(see Unrostered Player Handling).

---

## Raw CSR

Unchanged. The Z-score over `PlayerStat`, scaled to 1–5000 via
`2500 + (z * 1250 / (1 + |z|/3))`, stays intact. Renamed in UI from "CSR" to
"Raw CSR".

A new lightweight derived value:

- **Player composite CSR** = mean of the player's two most-played heroes'
  Raw CSRs over the active window. Used only by the unrostered-player TSR
  prediction.

---

## TSR — Core Algorithm

### Scale

- Range: **1 – 5000**, integer
- Population mean: **2500**
- Target σ: **≈ 750** (4000 ≈ top 2.5%, 4250 ≈ top 1%)
- Hard ceiling: 5000, hard floor: 1
- Soft cap (gain dampening) above 4000

### Tier priors

Each player is anchored at the prior of the **highest tier they have ever
played** in tracked tournaments — _not_ the tier of their first observed
match. (See "Why max-tier-prior" below for why this diverges from the original
spec.)

| Highest tier reached | Prior |
| -------------------- | ----- |
| No tracked history   | 2500  |
| Open                 | 2500  |
| CAH                  | 2500  |
| Advanced             | 2800  |
| Expert               | 3100  |
| Masters              | 3450  |
| OWCS                 | 3850  |

CAH (Calling All Heroes) shares the open prior — its skill distribution is
too wide to anchor higher.

### Match update — Elo with three multipliers

For each completed (non-forfeit) match in chronological order:

```
expected      = 1 / (1 + 10^((opp_rating - own_rating) / 400))
delta         = K_base * mov_multiplier * recency_weight * (actual - expected)
delta         = delta * gain_dampener(rating, sign(delta))
new_rating    = clamp(own_rating + delta, 1, 5000)
```

`actual` = 1.0 win, 0.0 loss. The opposing-team rating is the **mean of the
opposing roster's current TSRs**.

#### `K_base` — by per-player match count

| Matches played | K   |
| -------------- | --- |
| < 5            | 48  |
| 5–14           | 32  |
| 15–29          | 24  |
| 30+            | 16  |

#### `mov_multiplier` — closeness of the bo3/bo5/bo7 result

```
maxDiff        = ceil(bestOf / 2)
closeness      = (maxDiff - actualDiff) / maxDiff
mov_multiplier = 1.5 - closeness
```

| Format | Score | mov_multiplier |
| ------ | ----- | -------------- |
| bo3    | 2-0   | 1.50×          |
| bo3    | 2-1   | 1.00×          |
| bo5    | 3-0   | 1.50×          |
| bo5    | 3-1   | 1.17×          |
| bo5    | 3-2   | 0.83×          |
| bo7    | 4-0   | 1.50×          |
| bo7    | 4-1   | 1.25×          |
| bo7    | 4-2   | 1.00×          |
| bo7    | 4-3   | 0.875×         |

#### `gain_dampener` — soft cap near 5000, **positive deltas only**

```
gain_dampener = (delta > 0)
  ? 1 - max(0, (rating - 4000) / 1000)^2
  : 1
```

| Rating | Dampener |
| ------ | -------- |
| ≤ 4000 | 1.00     |
| 4250   | 0.94     |
| 4500   | 0.75     |
| 4750   | 0.44     |
| 4900   | 0.19     |
| 5000   | 0.00     |

Losses are never dampened — a top-rated player upset by a much weaker opponent
drops at full force.

#### `recency_weight` — exponential decay with **365-day half-life**

```
recency_weight(age_days) = 0.5 ^ (age_days / 365)
```

| Match age | Weight |
| --------- | ------ |
| Today     | 1.00   |
| 90 days   | 0.84   |
| 180 days  | 0.71   |
| 365 days  | 0.50   |
| 730 days  | 0.25   |
| 1095 days | 0.125  |

Half-life is configurable (`RECENCY_HALF_LIFE_DAYS`, default 365). Dry-run
showed the original 180-day default crushed historical OWCS anchor data to ~6%
weight, which combined with the first-observed-tier prior caused inactive
players to cling to inflated ratings while active players couldn't escape low
priors. 365 days keeps 2-year-old OWCS data at ~25% weight — historical
results still pull active players upward meaningfully.

### Forfeits

Matches with FACEIT status `cancelled`, `aborted`, or where one team forfeited
are **skipped entirely** — neither side's rating is affected. Status field
casing varies (`FINISHED` vs `finished`); both must be accepted.

### Roster credit

- Default: **all players on the registered FACEIT roster** receive credit
  (win or loss) for each non-forfeit match.
- A **manual sub override table** (`TsrRosterOverride`) lets admins exclude a
  registered player who didn't compete, or include a sub who did. Per-match
  granularity.

---

## Why max-tier-prior (deviation from v1 spec)

The v1 spec said: _"A player's prior is set by the tier of their first
observed FACEIT tournament."_ The dry-run revealed two failure modes:

1. **Inactive players cling to inflated ratings.** A player whose first match
   was an OWCS 2024 Stage 1 Main Event in April 2024 gets a 3850 prior. Their
   2-year-old matches now decay to ~25% weight (or 6% under the original 180d
   half-life). They never play again, but their rating sits at ~3845 forever.
   Dovestopher had 3 matches in April 2024 and was ranked #4 globally.
2. **Active players can't escape low priors.** A player whose first observed
   match was an OWCS Open Qualifier (open to anyone) is anchored at 2500.
   They subsequently reach OWCS Main Event and OWCS Central Regular Season,
   but their ~50 historical wins are recency-decayed and their opponents are
   anchored similarly low. pge ended up at 2557 with 57 matches across two
   years of OWCS-tier play.

**Max-tier-prior** fixes both: a player who has ever appeared in OWCS Main
Event / Regular Season / Playoffs is anchored at 3850 from the start of their
chronological replay. Subsequent matches move them organically. This requires
a one-pass pre-scan of the entire match pool to compute each player's
`max_tier_reached` before initialization.

The activity floor (below) handles the inactive-player surfacing problem
separately.

---

## Activity floor for display

Computed for every player; surfaced selectively.

```
ranked_publicly = (recent_match_count >= DISPLAY_MIN_RECENT_MATCHES)
where recent_match_count = matches in last DISPLAY_ACTIVITY_WINDOW_DAYS
```

Defaults: **3 matches in last 365 days**. Inactive players still have a
computed TSR, exposed in admin views and via the API but not on the public
leaderboard.

---

## Computation Strategy

TSR is **not** a streaming rating. It is **fully recomputed via chronological
replay** because the recency weight depends on each match's age relative to
_today_, not the time of the original update.

### Replay procedure (per region)

1. Collect all non-forfeit, finished, tracked-organizer, classifiable-tier
   matches involving any player in scope, sorted chronologically.
2. **Pre-scan**: for each player, find `max_tier_reached`. Initialize their
   rating to `TIER_PRIORS[max_tier_reached]` and their match counter to 0.
3. For each match, in order:
   - `K_eff = K_base(match_count) * mov_multiplier * gain_dampener(current_rating, sign) * recency_weight(today - match_date)`
   - Apply the Elo update against the opposing roster's average rating.
   - Increment the player's match counter.
4. Final rating after the last match = today's TSR.

### Recompute cadence

- **Daily** scheduled job for the full population.
- **On-demand** triggered by FACEIT `match_status_finished` webhooks scoped to
  the tracked organizer GUIDs. Recomputes only the affected players.

### Cost

Trivial. A few thousand players × a few hundred matches each replays in
seconds.

---

## Tier classification

FACEIT exposes neither a tier enum nor a stable `championship_id → tier`
mapping. The `/championships/{id}` endpoint **404s for many active and
archived events** — this was confirmed for the current S8 NA OWCS Central. We
therefore skip that endpoint entirely and classify from the
`competition_name` field on the `/matches/{match_id}` payload, which is
populated reliably.

The classifier is a regex chain. Order matters — earlier rules win:

```ts
function classifyTier(name: string): Tier {
  const n = name.toLowerCase();

  // OW2 is 5v5; explicitly reject mini formats. These run under the literal
  // "faceit" organizer (1v1/2v2/3v3 trials, brawl learnings) and would skew
  // Elo wildly if mixed with tournament play.
  if (
    /\b1v1\b|\b2v2\b|\b3v3\b|brawl vs brawl|\belimination\b|mini-poke|knight & squire|trial event/.test(
      n
    )
  )
    return "unclassified";

  // OWCS umbrella. Open Qualifiers / OQ Phase / generic "Qualifier" within
  // an OWCS-named event reduce to the open prior — most OQ participants are
  // open-tier teams attempting to break in. Anything else under the OWCS
  // umbrella (Main Event, Group X, Playoffs, Regular Season, Stage X) takes
  // the OWCS prior. OWWC (Overwatch World Cup) is also OWCS-tier prestige.
  if (/owcs|champions series|\bowwc\b/.test(n)) {
    if (/open\s*qualif|\boq\b|\bqualifier\b/.test(n)) return "open";
    return "owcs";
  }

  if (/master/.test(n)) return "masters";
  if (/expert/.test(n)) return "expert";
  if (/advanced/.test(n)) return "advanced";
  if (/calling all heroes|\bcah\b/.test(n)) return "cah";

  // FACEIT-run cups (Overdrive, WASB) and generic open / qualifier events.
  if (/open|qualif|cup|showdown/.test(n)) return "open";

  return "unclassified";
}
```

**Admin override remains required.** Edge cases like `Stage 4 Swiss Skip`,
`Tiebreaker Citrus Nation vs Critical Roll`, or one-off invitationals fall
through to `unclassified` and need to be hand-tagged before contributing to
TSR.

---

## Tracked organizer registry

The v1 spec listed two organizers and acknowledged the CAH GUID as TBD. The
dry-run discovered four practical organizers covering the bulk of NA/EMEA OW2
competitive play:

| Organizer GUID                         | What it runs                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `faceit_ow2`                           | FACEIT-run cups: Overdrive Cup, WASB Cup                                                                                                |
| `abd401de-e6ec-4ef1-8d4b-3d820f8f62ce` | OWCS 2024 (NA + EMEA Stage 1–4), Dreamhack Dallas, OWWC Conference Cups                                                                 |
| `f0e8a591-08fd-4619-9d59-d97f0571842e` | FACEIT League S1–S8 (Master / Expert / Advanced / Open Central) + OWCS Central S4–S8 + OWCS 2025/2026 OQs + EWC Master qualifiers + LCQ |
| `37d7c27f-ddb7-4c2c-91d5-771cfe3376cd` | Calling All Heroes (CAH)                                                                                                                |

**Drift caveat.** OWCS 2024 ran under `abd401de-...`. Mid-2024 the FACEIT
Master league transitioned to OWCS Central under the new organizer
`f0e8a591-...`, which now hosts essentially all current high-tier NA play.
The list above must be revisited every season — a per-season organizer
discovery script (sweep new championships, classify, propose tracking) is the
right ongoing maintenance posture, not a hardcoded constant.

The literal `faceit` organizer (no GUID, just the string `"faceit"`) is the
mini-format / trial-events organizer and is **explicitly excluded**.

---

## Regional Handling

Two separate ladders: **NA** and **EMEA**. Each player has at most one
regional TSR (assigned by their first observed FACEIT region).

**Cross-region matches** (LAN events, OWWC inter-conference): update each
side's regional rating using the opponent's regional rating directly, as if
they were in the same league. Over time, this keeps the two ladders calibrated.

**APAC and China** (WDG / NetEase OWCS) are out of scope for v1 — those
tournaments are not on FACEIT.

**Drift caveat.** Cross-region play is rare. The NA / EMEA ladders may drift
relative to each other between LAN events. Acceptable for v1.

---

## Team TSR

```
team_tsr = mean(player_tsr for player in starting_5)
```

Plain mean across the 5 starters. Role-weighting and "weakest link" floors
are deferred until we have real data to A/B against.

Output structure:

```ts
{
  value: number,                                  // 1–5000
  confidence: "high" | "medium" | "low",
  source: "tsr" | "predicted" | "csr_fallback"
}
```

---

## Unrostered Player Handling

| Real TSRs on team | Behavior                                                                               |
| ----------------- | -------------------------------------------------------------------------------------- |
| 5 of 5            | All real; `source = "tsr"`, `confidence = "high"`                                      |
| 4 of 5            | Predict TSR for the 1 unrostered; `source = "predicted"`, `confidence = "high"`        |
| 3 of 5            | Predict TSR for the 2 unrostered; `source = "predicted"`, `confidence = "medium"`      |
| 0–2 of 5          | Team rating uses Raw CSR for everyone; `source = "csr_fallback"`, `confidence = "low"` |

### Predicted TSR mechanic

```
team_offset    = mean(player.TSR - player.composite_CSR for player in rostered_with_tsr)
predicted_TSR  = clamp(unrostered.composite_CSR + team_offset, 1, 5000)
```

If `stdev(teammate_offsets) > THRESHOLD`, downgrade `confidence` to `"low"`
but still produce the prediction. Threshold to be tuned post-launch.

### CSR fallback team rating

When `source = "csr_fallback"`:

```
team_rating = mean(player.composite_CSR for player in starting_5)
```

This rating is **not comparable** to TSRs on the same scale — the UI must
label it distinctly.

---

## Data Sources

### FACEIT Data API

- Endpoint: `https://open.faceit.com/data/v4/`
- Auth: server-side API key, `Authorization: Bearer <key>`
- Rate limit: 10,000 req/hr per key
- Game ID: `ow2`

**Cloudflare caveat.** Some FACEIT endpoints return Cloudflare interstitials
when called via raw `curl`. Use Bun/Node `fetch` (which works consistently),
or set browser-like headers. The dry-run uses Bun and hits zero CF challenges.

### Webhooks

Subscribe to `match_status_finished` (and `match_status_cancelled`,
`match_status_aborted` to flag forfeits) scoped to the tracked organizer GUIDs.

### Player identity mapping

FACEIT exposes `game_player_id` for `ow2` players, which is the BattleTag they
linked at registration. Reverse-lookup endpoint:

```
GET /players?game=ow2&game_player_id=<battletag>
```

Returns the FACEIT `player_id` (GUID), the canonical key.

For nicknames that don't map cleanly to FACEIT handles (pros frequently use a
suffix like `pge4` on FACEIT), fall back to:

```
GET /search/players?nickname=<query>&game=ow2&offset=0&limit=20
```

Rank candidates by `verified` flag first, then by OW2 `skill_level` desc.

A `BattletagAlias` override table maps Parsertime BattleTags to FACEIT
`player_id` for renamed accounts (Battle.net linking on FACEIT is one-shot).

### Endpoints to avoid

`/championships/{id}` returns 404 for many active and archived events. The
match payload (`/matches/{match_id}`) carries `competition_name`,
`competition_type`, and `organizer_id` directly — use those for tier
classification and organizer verification. The dry-run script never calls
`/championships/{id}` and works correctly.

---

## Schema (sketch — not final)

```
FaceitPlayer
  faceit_player_id    pk  GUID
  battletag           indexed
  faceit_nickname
  region              NA | EMEA | OTHER
  verified            bool
  ow2_skill_level     int

Tournament
  faceit_championship_id  pk
  organizer_id
  name
  tier                    open | advanced | expert | masters | owcs | cah | unclassified
  region
  start_date
  classified_by           userId | "auto"
  classified_at

TournamentMatch
  faceit_match_id   pk
  championship_id   fk
  team1_id, team2_id
  format            bo3 | bo5 | bo7
  team1_score, team2_score
  status            finished | cancelled | aborted
  finished_at
  organizer_id      // denormalized from match payload for fast filtering

TournamentRoster
  match_id          fk
  team_side         team1 | team2
  faceit_player_id  fk

TsrRosterOverride
  match_id          fk
  faceit_player_id
  action            include | exclude

BattletagAlias
  battletag
  faceit_player_id

PlayerTsr
  faceit_player_id  pk
  region
  rating            1–5000
  match_count
  recent_match_count_365d
  max_tier_reached
  computed_at
```

---

## Calibration Reference

These are sanity-check targets, not contracts. The dry-run validates the
algorithm's _shape_ matches reality; absolute numbers depend on each player's
current form.

| Scenario                                        | Expected TSR |
| ----------------------------------------------- | ------------ |
| Top OWCS NA, sustained recent results           | 4000–4350    |
| OWCS bottom-of-table, mixed record              | 3500–3800    |
| OWCS player on a rough current run (e.g. 1W-3L) | 3700–3900    |
| Top-2 Masters, recent close OWCS qualifier loss | 3300–3550    |
| Mid-Masters                                     | 3200–3450    |
| Top-4 Expert finisher                           | 2900–3150    |
| Mid-Advanced                                    | 2700–2900    |
| Open champion, never advanced                   | 2600–2800    |
| Open team going 0-3 in groups, repeatedly       | 1800–2300    |
| Unranked scrim-only player                      | No TSR       |

---

## Out of Scope for v1

- APAC / China OWCS (not on FACEIT)
- FACEIT public matchmaking Elo as a signal (different distribution)
- FPL hub matches (top-NA invite-only daily ladder; tempting but not a
  bracketed tournament)
- Per-map updates (FACEIT's OW2 stats payload doesn't reliably attribute map
  wins to players)
- Role-weighted team aggregation
- Drift toward prior during inactivity beyond what recency decay provides
- Numeric rating uncertainty (Glicko-style RD); the source/confidence enum is
  the v1 surrogate

---

## Open Items

1. **Per-season organizer discovery script.** Sweep new championships under
   known and adjacent organizers, propose tier classifications, queue for
   admin review. Replaces the "hardcoded GUID list" with a self-maintaining
   registry.
2. **Variance threshold** for downgrading prediction confidence — pick after
   the first dry-run produces real teammate-offset distributions.
3. **Admin UI** for tier classification + sub overrides — wireframe before
   building.
4. **OWWC seeding policy.** OWWC matches go through Conference Cups
   (regional → inter-region). Confirm whether OWWC-only players (no FACEIT
   League history) should be tracked at all, given the limited match volume.
5. **EMEA seed validation.** The current dry-run is NA-anchored. Run with an
   EMEA Master/OWCS player as seed to confirm regional separation works as
   intended and the EMEA ladder calibrates similarly.

---

## Dry-run script

`scripts/tsr-dry-run.ts` — run with `FACEIT_API_KEY=<key> bun
scripts/tsr-dry-run.ts [seed-nickname]`. Pulls the seed player + opponents
(BFS one hop), replays the algorithm in-memory, and prints both an active
leaderboard and a small inactive tail. Cache lives in
`/tmp/parsertime-tsr-cache` — delete it to force a fresh fetch.
