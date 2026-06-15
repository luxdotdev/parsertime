# Source of truth: scripts/wp/gbm-prototype/train_gbm.py (deployed copy — keep in sync).
"""Per-mode GBM trainer: grouped CV (reuses harness), LightGBM fit, isotonic
calibration, gate, champion/challenger vs the live artifact's incumbent.
Produces the chosen family dict. Runs locally and inside the Vercel function."""
import numpy as np
from lightgbm import LGBMClassifier

from harness import (
    BASE_FEATURES, load_matrix, grouped_cv_predict, calibrated_metrics,
    fit_calibration,
)
from serialize import serialize_booster

GBM_PARAMS = dict(
    n_estimators=400, learning_rate=0.05, num_leaves=31, min_child_samples=200,
    subsample=0.8, subsample_freq=1, colsample_bytree=0.8, reg_lambda=1.0,
    random_state=42, n_jobs=-1, verbose=-1,
)
CAL_MAX_DEV = 0.10  # gate (matches metrics.ts CALIBRATION_MAX_DEVIATION)


def _gbm_fit_predict(X_tr, y_tr, X_val):
    return LGBMClassifier(**GBM_PARAMS).fit(X_tr, y_tr).predict_proba(X_val)[:, 1]


def gbm_gate_passes(metrics):
    """Beat base-rate log loss AND calibration within tolerance (matches checkGates)."""
    p = min(1 - 1e-12, max(1e-12, metrics["base_rate"]))
    baseline = -(p * np.log(p) + (1 - p) * np.log(1 - p))
    return metrics["log_loss"] < baseline and metrics["cal_max_dev"] <= CAL_MAX_DEV


def choose_family(gbm_family, gbm_gate_pass, incumbent):
    """Champion/challenger: ship GBM only if gated AND strictly better than the
    incumbent's CV log loss; else carry the incumbent forward verbatim."""
    if not gbm_gate_pass:
        return incumbent if incumbent is not None else gbm_family
    if incumbent is None:
        return gbm_family
    if gbm_family["metrics"]["logLoss"] < incumbent["metrics"]["logLoss"]:
        return gbm_family
    return incumbent


def train_candidate(path):
    """Train one mode's GBM + gate it. Returns (gbm_family_dict, gate_pass_bool).
    No champion/challenger here — the TS publish route decides vs the incumbent."""
    match_ids, X, y, _ = load_matrix(path, None)
    X = X[:, :BASE_FEATURES]  # the 21 shipped features (handles 24- and 126-col CSVs)
    preds, labels = grouped_cv_predict(match_ids, X, y, _gbm_fit_predict)
    m = calibrated_metrics(preds, labels)
    base_rate = float(np.mean(labels))
    gate = gbm_gate_passes({"log_loss": m["log_loss"], "cal_max_dev": m["cal_max_dev"], "base_rate": base_rate})
    booster = LGBMClassifier(**GBM_PARAMS).fit(X, y).booster_
    ser = serialize_booster(booster)
    cal = fit_calibration(preds.tolist(), labels.tolist())
    family = {
        "kind": "gbm", "trees": ser["trees"], "baseScore": ser["baseScore"],
        "sampleCount": int(len(y)),
        "calibration": {"x": cal["x"], "y": cal["y"]},
        "metrics": {"logLoss": m["log_loss"], "brier": m["brier"], "baseRate": base_rate},
    }
    return family, gate


def train_family(path, incumbent):
    """Train one mode; return the chosen family dict (gbm or carried incumbent).
    Local build path — champion/challenger still runs here against the passed
    incumbent (the Vercel function uses train_candidate + the TS publish route)."""
    family, gate = train_candidate(path)
    return choose_family(family, gate, incumbent)
