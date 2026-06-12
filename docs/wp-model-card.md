# Model card — Parsertime win probability (Match Story)

**Model:** `wp-models/model-v1.json` · feature hash `6d32187c9a3f` · trained 2026-06-12
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
learns *what game states win*, not anything about specific teams. From ~4,300
usable maps the export produces ~2.07M labeled snapshots (one every 5 seconds
plus every fight boundary, two mirrored rows per snapshot so the model is
exactly antisymmetric between teams).

Labels: Control rounds by per-round score delta; other modes by the canonical
`calculateWinner` (captures → farthest distance → score). Score-tied
flashpoint logs are excluded rather than force-labeled. Clash is excluded
(retired mode). **Push is excluded entirely**: the logs carry no robot
distance signal, so Push winners are underivable today.

## Features (15)

Game state is reconstructed from log events in one pass
(`src/lib/win-probability/game-state.ts`); the same code feeds training and
inference, and the artifact embeds a feature-list hash so a mismatched model
refuses to load.

| Group | Features |
| --- | --- |
| Kills | `aliveDiff` (respawn-adjusted, 10s constant), `aliveDiff × objMax`, `aliveDiff × controlMax` |
| Ults | `ultBankDiff` (charged-unspent; survives death), `ultBankDiff × timeRemaining` |
| Objective | `scoreDiff`, `objProgressOwn/Enemy` (contest %), `controlProgressOwn/Enemy` (control win %), `holdsObjective` (±1), `scoreDiff × roundNumber` |
| Context | `timeRemainingNorm`, `isAttacker`, `roundNumberNorm` |

Hand-built interactions stand in for what a gradient-boosted model would
discover (a man advantage at 99% control is round-deciding; at 20% it is
tempo). Data-quality rules that mattered: progress events from a previous
round are dropped by round number, and in Escort/Hybrid only the attacking
team can generate progress (loggers mis-stamp the dying round's final tick in
three different ways; the domain rule subsumes them all).

## Per-family results (5-fold CV, grouped by map; calibrated outputs)

| Family | Snapshots | Log loss (base 0.693) | Brier | Status |
| --- | --- | --- | --- | --- |
| Control | 815,020 | 0.6440 | 0.2266 | shipped |
| Escort/Hybrid | 1,237,514 | 0.6705 | 0.2391 | shipped |
| Flashpoint | 16,476 | 0.6232 | 0.2258 | shipped |
| Push | 4,924 | — | — | disabled (no labels) |

Cross-validation folds are **grouped by map** — snapshots from the same round
are heavily autocorrelated, and a random split would leak and flatter every
number above.

**Calibration is the headline property, not accuracy.** Every shipped bin
(predicted vs. observed win rate, 10 bins) is within a few points of the
diagonal; the deploy gate fails any retrain whose calibrated bins drift more
than 10 points (n ≥ 200) or that loses to the base rate. That is what makes
"this fight cost you 30%" an honest sentence. Skill over the base rate is
deliberately modest (Brier skill ≈ 4–10%): most 5-second snapshots are
genuinely near coin-flips; the model earns its keep at decisive moments.

An isotonic recalibration layer (PAVA over held-out CV predictions, stored as
knots in the artifact) corrects the linear model's overconfident extremes —
it is what brought Flashpoint inside the gates.

## Key coefficients (standardized; sign = effect on the perspective team)

**Control** (`n=815K`): `holdsObjective` **+0.62**, `controlProgressOwn/Enemy`
**±0.42**, `scoreDiff × roundNumber` +0.24, `aliveDiff` +0.18, `ultBankDiff`
+0.13. Reads like Overwatch sense: holding the point dominates, then control
percentages, then bodies and banks.

**Escort/Hybrid** (`n=1.24M`): `holdsObjective` +0.25, `objProgress` ±0.23,
`scoreDiff` +0.17, `scoreDiff × roundNumber` +0.17, `aliveDiff` +0.10,
`ultBankDiff` **+0.02**. Note the tiny ult weight: at map-win granularity an
ult advantage decays within a fight or two, so escort cascade insights are
honest but small.

**Flashpoint** (`n=16.5K`): coefficients are **not individually
interpretable** — `aliveDiff` is −0.94 offset by `aliveDiff × objMax` +0.52,
a collinearity artifact of the small sample. Group-level driver sums (used by
Match Story) remain well-behaved; per-feature readings do not.

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
  coaching tool. Escort tops out near ~0.73 before the outcome snap because
  no regulation-round state guarantees a multi-round map.
- **Respawns are a 10-second constant**; real respawn timing varies
  (overtime, assemble phases). Stagger carryovers are approximate.
- **No hero identity, no positions.** A banked Zenyatta ult and a banked
  Sound Barrier weigh the same; coordinate data is an untapped upgrade path.
- **Flashpoint rests on 16.5K rows** — highest per-map variance of the
  shipped families, and the collinear coefficients above.
- **Round-2+ escort states** were the hardest to calibrate (a team "down
  0–3" with its attack pending is not losing); the round-number interaction
  carries this, and residual tail error was the last gate failure fixed.
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

Spec and plans: `docs/superpowers/specs/2026-06-12-win-probability-match-story-design.md`.
