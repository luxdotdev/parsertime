# Model card — Parsertime win probability (Match Story)

**Model:** `wp-models/model-v3.json` · feature hash `27b4a8ec1f49` · trained 2026-06-14
**Architecture:** per-mode **gradient-boosted trees (LightGBM)** + isotonic recalibration,
selected per mode by champion/challenger over the prior logistic-regression model
**Serving:** pure-TypeScript tree inference; Cloudflare R2 artifact, hourly-TTL cached loader
**Training:** weekly Vercel Python function (LightGBM) fed by a TS feature-matrix export

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
the map-count gate.

## Features (21)

Game state is reconstructed from log events in one pass
(`src/lib/win-probability/game-state.ts`); the same code feeds training and
inference, and the artifact embeds a feature-list hash so a mismatched model
refuses to load. The feature set is unchanged from the prior LR model — the GBM
trains on the same 21 features (the bake-off rejected adding hero composition,
see below).

| Group     | Features                                                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kills     | `tankAliveDiff`, `dpsAliveDiff`, `supportAliveDiff` (respawn-adjusted, 10s constant, split by the victim's hero role), `aliveDiff × objMax`, `aliveDiff × controlMax` |
| Ults      | `tankUltDiff`, `dpsUltDiff`, `supportUltDiff` (charged-unspent banks, by role; Echo duplicates count as Damage), `ultBankDiff × timeRemaining`                        |
| Objective | `scoreDiff`, `objProgressOwn/Enemy` (contest %), `controlProgressOwn/Enemy` (control win %), `holdsObjective` (±1), `objectiveIndexNorm`, `scoreDiff × roundNumber`   |
| Context   | `timeRemainingNorm`, `isAttacker`, `roundNumberNorm`, `isOvertime`                                                                                                    |

The hand-built interaction features (`aliveDiff × objMax`, etc.) are retained but
are now largely redundant — a tree model discovers interactions itself, and they
rank low in gain importance. The team-key parsing correctness fix (a prior
revision) — the per-player sweep key uses a tab delimiter because team names
contain spaces — remains essential; without it `aliveDiff` was noise on ~92% of
maps.

## Model: per-mode GBM via champion/challenger

Each weekly retrain trains a LightGBM model per mode and, for that mode, ships it
only if it **passes the calibration gate AND beats the incumbent's CV log loss**;
otherwise the incumbent family (which may be the prior LR) is carried forward
verbatim. The artifact is therefore a per-mode mix of model kinds — a tree family
`{ kind: "gbm", trees, baseScore, calibration, metrics }` or the legacy linear
family `{ kind: "lr", weights, … }` — behind one feature hash. A `kind`-less
family loads as LR (backward compatibility). model-v3 ships GBM for all three
shipped modes.

LightGBM params (fixed, untuned): 400 trees, learning_rate 0.05, num_leaves 31,
min_child_samples 200, subsample/colsample 0.8, reg_lambda 1.0. Light
hyperparameter tuning is a future improvement; the gate + champion/challenger
prevent a bad model shipping.

## Per-family results (5-fold CV, grouped by map; calibrated outputs)

| Family        | Model | Maps   | Log loss (base 0.693) | Status               | vs prior LR    |
| ------------- | ----- | ------ | --------------------- | -------------------- | -------------- |
| Control       | GBM   | ~2,300 | 0.5966                | shipped              | 0.6180 (−3.5%) |
| Escort/Hybrid | GBM   | ~3,300 | 0.6378                | shipped              | 0.6635 (−3.9%) |
| Flashpoint    | GBM   | ~1,560 | 0.5841                | shipped              | 0.5891 (−0.8%) |
| Push          | —     | 17     | —                     | disabled (no labels) | —              |

Pooled log loss undersells the gain: the win is concentrated at **decisive
moments**. On snapshots where |WP−0.5| > 0.3, the bake-off measured GBM beating
LR by **~13% relative log loss on control and escort** and ~3.5% on flashpoint —
and the LR was pathologically timid (on escort it made only 364 confident
predictions across 1.25M snapshots vs GBM's 66,076). Full bake-off:
`docs/wp-gbm-bakeoff-findings.md`.

Cross-validation folds are **grouped by map** — snapshots from the same round are
heavily autocorrelated, and a random split would leak. A `MIN_FAMILY_MAPS = 100`
gate disables any family with too few distinct maps for grouped CV to be
meaningful (this is what keeps Push out).

**Calibration is the headline property, not accuracy.** Every shipped bin
(predicted vs. observed win rate, 10 bins) is within a few points of the diagonal;
the deploy gate fails any retrain whose calibrated bins drift more than 10 points
(n ≥ 200) or that loses to the base rate. An isotonic recalibration layer (PAVA
over held-out CV predictions, stored as knots in the artifact) sits on top of the
tree ensemble's sigmoid output. (Escort GBM calibration is the tightest case —
max-deviation ~0.06, within gate; watched per retrain.)

## Feature importance (GBM gain)

Trees have no signed coefficients; gain importance shows what they split on.
Objective state dominates every mode — `scoreDiff`, `controlProgressOwn/Enemy`,
`objProgressOwn/Enemy`, `holdsObjective` — with the role-split alive/ult features
secondary and the hand-built interaction columns ranking low (the model
rediscovers those interactions itself). `isOvertime`/`objectiveIndexNorm` remain
near-unused.

## Driver decomposition (the "why" in Match Story)

The fight-swing breakdown into objective/kills/ults is now **model-agnostic
ablation** (it must be — trees aren't linearly decomposable). For each driver
group, the swing is re-scored with that group's GameState fields reset to their
before-fight values; the WP the group "loses" is its contribution, normalized so
the parts sum to the swing. This works identically for GBM and LR and replaced
the old LR-only linear identity. It measures actual WP impact rather than
standardized-logit shares; it inherits the model's blind spots, and the "other"
context features (time, attacker role) are unattributed by design.

## Serving & training pipeline

- **Inference (TS, hot path):** `predictWinProbability` branches on family kind.
  GBM = `isotonic(sigmoid(baseScore + Σ reached-leaf values))` via a hand-rolled
  tree traversal — no Python on the request path. A committed parity fixture
  (`test/win-probability/fixtures/gbm-parity.json`) asserts the TS traversal
  reproduces LightGBM's own probabilities to <1e-6; it is the regression guard on
  the inference port.
- **Training (weekly):** the Vercel cron route exports per-mode feature matrices
  (CSV) to Vercel Blob and fires a Vercel **Python** function (`api/wp-train/`)
  that trains LightGBM, calibrates, and gates each mode, then gzip-POSTs the
  candidate families + gate flags to a TS publish callback (`/api/cron/wp-publish`).
  The publish route loads the live incumbent from R2, runs the per-mode
  champion/challenger decision (`chooseFamily`), and publishes — so both the
  incumbent load and the R2 publish stay single-sourced in TypeScript, the
  incumbent never travels the wire, and Python never holds R2 credentials. (The
  payload is gzipped because the raw artifact is ~4.4MB, near Vercel's 4.5MB body
  limit.)

## Deployment

Required Vercel env vars for the weekly retrain (`api/wp-train/`):

| Var               | Required | Description                                                                                                                   |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `CRON_SECRET`     | yes      | Bearer token; must match the `/api/cron/wp-retrain` and `/api/cron/wp-publish` routes                                         |
| `WP_FEATURE_HASH` | yes      | Must equal the TS `featureHash()` (currently `27b4a8ec1f49`); the publish route 400-rejects an artifact whose hash mismatches |
| `PUBLISH_URL`     | yes      | Full URL of the publish callback, e.g. `https://<deployment>/api/cron/wp-publish`                                             |

## Limitations — read before trusting an edge case

- **Respawns are a 10-second constant**; real respawn timing varies (overtime,
  assemble phases). Stagger carryovers are approximate.
- **Hero identity does not help — confirmed under both model classes.** A team
  hero-composition multi-hot (own+enemy, 102 columns) was tested with LR (made
  every mode worse) and again in the GBM bake-off (GBM-123 vs GBM-21: flat-to-
  worse). Trees find some hero signal (flashpoint especially) but not enough to
  generalize. Shelved; the next feature bet is positional/coordinate data.
- **No positions.** Coordinate data is unused; spatial features remain untapped.
- **WPA is attribution by convention**, not causality: final blows, assists,
  deaths (first weighted heaviest), and ult usage split a fight's swing. The UI
  exposes the per-fight breakdown precisely so it can be audited.
- The model scores **states, not decisions** — it cannot know an ult was
  "wasted," only that the bank changed and the fight was lost.
- **GBM is untuned** (fixed params); the gate and champion/challenger are the
  guards against a bad retrain, and any mode that regresses falls back to its
  incumbent rather than shipping.

## Privacy & governance

The artifact contains only model parameters (tree structures / linear
coefficients, calibration knots, CV metrics) — no player names, no team
identifiers, no match data. It is never committed to the repository; it lives in
R2 and is versioned (`model-vN.json` + `latest.json` pointer). Weekly retrains
publish per-mode only when the gate passes and the model beats its incumbent; a
failed or worse mode keeps the previous model serving. Rollback is re-pointing
`latest.json`.

## Reproduction

Local (the bake-off / first-artifact tooling):

```
bun scripts/wp/export-dataset.ts          # dev DB → artifacts/wp/dataset-<family>.csv
cd scripts/wp/gbm-prototype && uv run python build_artifact.py   # champion/challenger → model-gbm.json
bun scripts/wp/upload-gbm.ts              # validate hash + publish to R2
```

Production retrains run weekly via `/api/cron/wp-retrain` → `api/wp-train` →
`/api/cron/wp-publish`.

Spec and plans: `docs/superpowers/specs/2026-06-14-wp-gbm-engine-design.md`,
`docs/wp-gbm-bakeoff-findings.md`.
