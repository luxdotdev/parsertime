# WP GBM bake-off — findings (Phase 2a)

**Date:** 2026-06-14 · **Verdict: GO on Phase 2b** (productionize a gradient-boosted-tree
model on the existing 21-feature set; do **not** add hero composition).

Offline comparison of LightGBM vs the shipped logistic regression (model-v2), per mode,
on identical grouped-CV folds. Prototype: `scripts/wp/gbm-prototype/`. Design:
`docs/superpowers/specs/2026-06-14-wp-gbm-bakeoff-design.md`.

## Greenlight rule (set before the run)

Productionize GBM only if it beats LR by **≥ ~3% relative log loss on the decisive subset**
(snapshots where |calibrated WP − 0.5| > 0.3) for **control and escort**, while holding
aggregate calibration. The decisive subset is the lens because pooled log loss is dominated
by near-coin-flip snapshots and undersells a sharper model — and decisive moments are what a
coaching tool is read for.

## Harness validation (trust anchor)

The harness's own LR reproduces the shipped model's calibrated CV log loss within ±0.0005,
proving the fold port (FNV-1a, matched to `cv.ts`), calibration (20-bin PAVA), and metrics
are faithful — so the GBM comparison is apples-to-apples:

| Mode          | harness LR | shipped LR | Δ       |
| ------------- | ---------- | ---------- | ------- |
| control       | 0.6180     | 0.6180     | +0.0000 |
| escort_hybrid | 0.6633     | 0.6635     | −0.0002 |
| flashpoint    | 0.5886     | 0.5891     | −0.0005 |

GBM library: LightGBM 4.6.0 (no fallback). Conservative, untuned params
(`n_estimators=400, lr=0.05, num_leaves=31, min_child_samples=200`), so these numbers are a
**lower bound** on GBM's potential.

## Results

Calibrated CV log loss (lower = better); decisive = subset with |WP−0.5| > 0.3.

| Mode              | config  | aggregate | cal max-dev | decisive   | decisive n |
| ----------------- | ------- | --------- | ----------- | ---------- | ---------- |
| **control**       | LR-21   | 0.6180    | 0.003       | 0.4318     | 88,992     |
|                   | GBM-21  | 0.5970    | 0.003       | **0.3738** | 139,613    |
|                   | GBM-123 | 0.5946    | 0.002       | 0.3785     | 148,471    |
| **escort_hybrid** | LR-21   | 0.6633    | 0.024       | 0.5110     | 364        |
|                   | GBM-21  | 0.6379    | 0.059       | **0.4419** | 66,076     |
|                   | GBM-123 | 0.6433    | 0.022       | 0.4744     | 22,259     |
| **flashpoint**    | LR-21   | 0.5886    | 0.006       | 0.3461     | 136,312    |
|                   | GBM-21  | 0.5841    | 0.004       | **0.3340** | 141,206    |
|                   | GBM-123 | 0.5936    | 0.006       | 0.3589     | 125,734    |

**Decisive relative improvement, best GBM vs LR:** control **+13.4%**, escort **+13.5%**,
flashpoint **+3.5%**. All three clear the 3% bar; control and escort clear it ~4×.

## What it means

1. **The model class was the bottleneck, decisively.** GBM-21 — the _same 21 features_, just
   trees instead of logistic regression — delivers almost the entire gain (+13% decisive on
   control and escort). This cleanly isolates model capacity, not feature engineering, as the
   lever. It confirms the hypothesis that motivated Phase 2.

2. **The LR was pathologically timid at decisive moments — GBM fixes it.** On escort the LR
   produces only **364** confident predictions across 1.25M snapshots; GBM-21 confidently
   (and accurately) handles **66,076**. This is the model card's "conservative by
   construction, under-sharpens decisive moments" limitation made concrete — exactly the
   states a coaching tool exists to explain. The qualitative win here exceeds the log-loss
   number.

3. **Hero identity still does not pay off — even under trees.** GBM-123 (+102 hero columns)
   is marginally better than GBM-21 on control _aggregate_ but **worse on the decisive
   subset** there, and worse on escort and flashpoint. Hero features do earn nonzero
   importance (notably flashpoint, where Tracer/Sojourn/Genji rank 3rd–6th), so there is
   _some_ signal — but not enough to generalize at this data scale; it adds CV-time variance.
   Shelve hero composition again; the lift is in the model, not these features.

4. **One calibration flag for Phase 2b.** GBM-21 on escort has aggregate calibration
   max-deviation **0.059** — below the 0.1 production gate, but notably worse than LR (0.024)
   and than GBM-123 (0.022). GBM trades some calibration tameness for decisiveness; Phase 2b
   should budget recalibration iterations (isotonic on holdout, as today) and re-check the
   gate per mode before shipping.

### Top GBM-123 importances (gain %, abridged)

- **control:** scoreDiff 6.0, controlProgressOwn/Enemy ~4, objProgressOwn/Enemy ~3.7,
  roundNumberNorm 2.7; first hero feature (`enemy_hero_tracer`) at rank 10 (~1.8%).
- **escort_hybrid:** objProgress ~2.9, scoreDiff 2.8, timeRemainingNorm 2.5; heroes from
  rank 9, dominated by supports (Ana, Baptiste, Kiriko, Lúcio).
- **flashpoint:** scoreDiff 5.0, isAttacker 2.5, then **heroes at ranks 3–6**
  (Tracer/Sojourn/Genji) — the one mode where composition is meaningfully predictive, yet
  GBM-123 still loses to GBM-21 on the decisive subset (overfit on the smaller sample).

## Recommendation for Phase 2b

Build the production GBM engine on the **21-feature set** (GBM-21). Open design forks to
resolve there (sketched in the earlier Vercel-Python research):

- **Training runtime:** Vercel Python cron vs GitHub Actions (LightGBM is Python; can't run
  in the current in-process TS cron).
- **Serving:** hand-rolled TS tree-traversal inference to keep the match-story hot path
  dependency-free and Python-free (only training is Python).
- **Artifact:** a tree schema alongside the current linear `FamilyModel`, behind the same
  featureHash guard and R2 versioning.
- **Per-mode rollout** under the existing grouped-CV calibration gates; re-tune calibration
  for escort (the 0.059 flag), and consider light hyperparameter tuning (this prototype was
  untuned, so production GBM should do at least as well).

Hero composition stays shelved. The next _feature_ bet, if pursued, is positional/coordinate
data — not more hero columns.
