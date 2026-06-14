# WP GBM bake-off (Phase 2a, offline)

Local-only prototype answering whether a gradient-boosted-tree model beats the
shipped logistic regression at decisive moments (see
`docs/superpowers/specs/2026-06-14-wp-gbm-bakeoff-design.md`). Not serving code.
Python is managed with **uv**.

## Setup (uv)
    uv sync                 # creates .venv and installs from pyproject.toml + uv.lock

## Data
`data/dataset-<family>.csv` are the corrected 126-column matrices (3 meta + 123
features), gitignored. Regenerate per the plan's Task 1 if missing.

## Run
    uv run pytest             # port unit tests (folds, metrics, calibration)
    uv run python bakeoff.py  # the full LR-vs-GBM comparison
