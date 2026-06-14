# Model card — Parsertime win probability (Match Story)

**Model:** `wp-models/model-v2.json` · feature hash `27b4a8ec1f49` · trained 2026-06-13
**Architecture:** per-mode logistic regression + isotonic recalibration (all TypeScript)
**Serving:** Cloudflare R2 artifact, hourly-TTL cached loader, retrained weekly by `/api/cron/wp-retrain`

## What it predicts

For any moment in a parsed scrim map, the probability that a given team wins
the **current round** (Control) or the **map** (Escort/Hybrid, Flashpoint),
from the game state at that moment. Match Story uses it to draw the WP
timeline, price each fight's swing (WP after − WP before), compute
counterfactual carryovers (re-scoring a state with ult banks or alive counts
neutralized), attribute per-player WPA, and decompose swings into drivers.

The target differs by mode on purpose: a lone Escort round has no
self-contained winner — the map does — so escort numbers answer "will we win
the map," which dilutes single-fight effects relative to Control.

## Training data

All teams' parsed scrims, globally pooled and team-anonymous — the model
learns _what game states win_, not anything about specific teams. From ~7,200
usable maps the export produces ~2.7M labeled snapshots (one every 5 seconds
plus every fight boundary, two mirrored rows per snapshot so the model is
exactly antisymmetric between teams).

Labels: Control rounds by per-round score delta; other modes by the canonical
`calculateWinner` (captures → farthest distance → score). Score-tied
flashpoint logs are excluded rather than force-labeled. Clash is excluded
(retired mode). **Push is excluded**: the logs carry no robot distance signal,
so Push winners are underivable, and it has only ~17 distinct maps — far below
the map-count gate (see below).

## Features (21)

Game state is reconstructed from log events in one pass
(`src/lib/win-probability/game-state.ts`); the same code feeds training and
inference, and the artifact embeds a feature-list hash so a mismatched model
refuses to load.

| Group     | Features                                                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kills     | `tankAliveDiff`, `dpsAliveDiff`, `supportAliveDiff` (respawn-adjusted, 10s constant, split by the victim's hero role), `aliveDiff × objMax`, `aliveDiff × controlMax` |
| Ults      | `tankUltDiff`, `dpsUltDiff`, `supportUltDiff` (charged-unspent banks, by role; Echo duplicates count as Damage), `ultBankDiff × timeRemaining`                        |
| Objective | `scoreDiff`, `objProgressOwn/Enemy` (contest %), `controlProgressOwn/Enemy` (control win %), `holdsObjective` (±1), `objectiveIndexNorm`, `scoreDiff × roundNumber`   |
| Context   | `timeRemainingNorm`, `isAttacker`, `roundNumberNorm`, `isOvertime`                                                                                                    |

The alive/ult diffs are **role-split** (tank/dps/support) rather than single
aggregates: the role identity of who is down or who is holding an ult carries
more signal than a raw count (the interactions still use the aggregate sums to
avoid collinearity). Hand-built interactions stand in for what a
gradient-boosted model would discover (a man advantage at 99% control is
round-deciding; at 20% it is tempo).

Data-quality rules that mattered: progress events from a previous round are
dropped by round number; in Escort/Hybrid only the attacking team can generate
progress (loggers mis-stamp the dying round's final tick in three different
ways; the domain rule subsumes them all); and the per-player team key uses a
tab delimiter (team names contain spaces — see the correctness note below).

## Correctness fix in this revision

A latent bug parsed the per-player `"<team> <player>"` sweep key with
`split(" ")[0]`, which returns only the first token for any team name
containing a space — **~92% of maps**, including the default "Team 1"/"Team 2".
Every death (and every banked ult) then bucketed to one side, so `aliveDiff`
and the role splits were noise on almost all data. Fixing the delimiter is the
dominant improvement in this revision (it, not the feature additions, is what
moved the numbers): control log loss **0.6441 → 0.6180** (−4.1%), escort
**0.6705 → 0.6635** (−1.0%), flashpoint **0.5995 → 0.5891** (−1.7%). The
role-alive coefficients went from near-zero to substantial as a direct result.

## Per-family results (5-fold CV, grouped by map; calibrated outputs)

| Family        | Snapshots | Maps  | Log loss (base 0.693) | Brier  | Status               |
| ------------- | --------- | ----- | --------------------- | ------ | -------------------- |
| Control       | 826,444   | 2,298 | 0.6180                | 0.2148 | shipped              |
| Escort/Hybrid | 1,250,576 | 3,302 | 0.6635                | 0.2356 | shipped              |
| Flashpoint    | 631,132   | 1,558 | 0.5891                | 0.2034 | shipped              |
| Push          | 5,948     | 17    | —                     | —      | disabled (no labels) |

Cross-validation folds are **grouped by map** — snapshots from the same round
are heavily autocorrelated, and a random split would leak and flatter every
number above. A `MIN_FAMILY_MAPS = 100` gate disables any family with too few
distinct maps for grouped CV to be meaningful (this is what keeps Push out:
thousands of rows, but only 17 maps).

**Calibration is the headline property, not accuracy.** Every shipped bin
(predicted vs. observed win rate, 10 bins) is within a few points of the
diagonal; the deploy gate fails any retrain whose calibrated bins drift more
than 10 points (n ≥ 200) or that loses to the base rate. That is what makes
"this fight cost you 30%" an honest sentence. Skill over the base rate is
deliberately modest: most 5-second snapshots are genuinely near coin-flips;
the model earns its keep at decisive moments.

An isotonic recalibration layer (PAVA over held-out CV predictions, stored as
knots in the artifact) corrects the linear model's overconfident extremes.

## Key coefficients (standardized; sign = effect on the perspective team)

**Control** (`n=826K`): `holdsObjective` **+0.58**, `controlProgressOwn/Enemy`
**±0.44**, `scoreDiff × roundNumber` +0.22, `dpsAliveDiff` +0.21,
`supportAliveDiff` +0.19, `tankAliveDiff` +0.18, `aliveDiff × objMax` +0.13.
Reads like Overwatch sense: holding the point dominates, then control
percentages, then bodies (now split by role) and banks.

**Escort/Hybrid** (`n=1.25M`): `holdsObjective` +0.25, `objProgress` ±0.22,
`dpsAliveDiff`/`supportAliveDiff` +0.16, `scoreDiff` +0.15, `scoreDiff ×
roundNumber` +0.15, `isAttacker` −0.13, `tankAliveDiff` +0.13. Ult banks are
small (≤0.05): at map-win granularity an ult advantage decays within a fight
or two, so escort cascade insights are honest but small.

**Flashpoint** (`n=631K`): `scoreDiff` **+0.75** dominates (points already won
strongly predict the map), `scoreDiff × roundNumber` +0.29, `holdsObjective`
+0.19, alive splits ~+0.12. Far better behaved than the prior 16.5K-row
flashpoint model — the round-pairing export fix plus the team-key fix gave it
a real sample.

`isOvertime` and `objectiveIndexNorm` train to ≈0 weight in every mode — they
are carried for completeness but add no signal under this model.

## Driver decomposition (the "why" in Match Story)

Because the model is linear in logit space, a fight's swing decomposes
exactly: `Δlogit = Σ wᵢ·Δxᵢ/σᵢ`. Match Story groups terms into
objective/kills/ults, scales the logit shares onto the calibrated swing, and
names the dominant driver in insights and takeaways. This is arithmetic on
the model, not a heuristic — but it inherits the model's blind spots (below).

## Limitations — read before trusting an edge case

- **Conservative by construction.** A logistic model with hand-built
  interactions under-sharpens decisive moments relative to a GBM. Swings
  read slightly smaller than reality; that is the safe direction for a
  coaching tool.
- **Respawns are a 10-second constant**; real respawn timing varies
  (overtime, assemble phases). Stagger carryovers are approximate.
- **Hero identity does not help this model.** A team hero-composition
  multi-hot (own+enemy, 102 columns) was tested and **rejected**: under
  logistic regression it made every mode _worse_ (control +0.1%, escort
  +0.5%, flashpoint +1.3% log loss) — added variance with no signal LR can
  exploit. Hero identity is expected to pay off only with a model that can
  represent interactions (gradient-boosted trees); that is the next upgrade
  path, not more columns.
- **No positions.** Coordinate data is unused; spatial features remain an
  untapped upgrade path.
- **WPA is attribution by convention**, not causality: final blows, assists,
  deaths (first weighted heaviest), and ult usage split a fight's swing.
  The UI exposes the per-fight breakdown precisely so it can be audited.
- The model scores **states, not decisions** — it cannot know an ult was
  "wasted," only that the bank changed and the fight was lost.

## Privacy & governance

The artifact contains only aggregate coefficients, scaling parameters,
calibration knots, and CV metrics — no player names, no team identifiers, no
match data. It is never committed to the repository; it lives in R2 and is
versioned (`model-vN.json` + `latest.json` pointer). Weekly retrains publish
only if every gate passes; a failed run logs to Axiom and keeps the previous
model serving. Rollback is re-pointing `latest.json`.

## Reproduction

```
npm run wp:export        # dev DB → artifacts/wp/dataset-<family>.csv
npm run wp:train         # CV, gates, fit → artifacts/wp/model-v1.json
npm run wp:train -- --upload   # …and publish to R2
```

Spec and plans: `docs/superpowers/specs/2026-06-12-win-probability-match-story-design.md`,
`docs/superpowers/specs/2026-06-12-wp-feature-expansion-spec.md`.
