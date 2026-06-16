"""Offline harness for the WP GBM bake-off. Ports the TypeScript grouped-CV
fold, metrics, and isotonic calibration so LR and GBM are judged identically
to the shipped pipeline. Not serving code."""

import math

_EPS = 1e-12
_FIT_BINS = 20


def group_fold(match_id: int, k: int) -> int:
    """FNV-1a over the decimal matchId string, mod k — matches cv.ts groupFold.
    32-bit unsigned arithmetic via & 0xFFFFFFFF (mirrors Math.imul + >>> 0)."""
    s = str(match_id)
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h % k


def log_loss(preds, labels):
    s = 0.0
    for p, y in zip(preds, labels):
        p = min(1 - _EPS, max(_EPS, p))
        s += -math.log(p) if y == 1 else -math.log(1 - p)
    return s / len(preds)


def brier(preds, labels):
    return sum((p - y) ** 2 for p, y in zip(preds, labels)) / len(preds)


def fit_calibration(preds, labels):
    """20-bin PAVA isotonic; knots = (mean pred, pooled observed rate).
    Mirrors calibration.ts fitCalibration exactly."""
    bins = [{"pred": 0.0, "label": 0.0, "n": 0} for _ in range(_FIT_BINS)]
    for p, y in zip(preds, labels):
        idx = min(_FIT_BINS - 1, int(p * _FIT_BINS))
        bins[idx]["pred"] += p
        bins[idx]["label"] += y
        bins[idx]["n"] += 1
    blocks = []
    for b in bins:
        if b["n"] == 0:
            continue
        blocks.append(dict(b))
        while len(blocks) >= 2:
            last, prev = blocks[-1], blocks[-2]
            if prev["label"] / prev["n"] <= last["label"] / last["n"]:
                break
            prev["pred"] += last["pred"]
            prev["label"] += last["label"]
            prev["n"] += last["n"]
            blocks.pop()
    return {
        "x": [b["pred"] / b["n"] for b in blocks],
        "y": [b["label"] / b["n"] for b in blocks],
    }


def apply_calibration(cal, p):
    x, y = cal["x"], cal["y"]
    if not x:
        return p
    if p <= x[0]:
        return y[0]
    if p >= x[-1]:
        return y[-1]
    i = 1
    while x[i] < p:
        i += 1
    t = (p - x[i - 1]) / (x[i] - x[i - 1])
    return y[i - 1] + t * (y[i] - y[i - 1])


def calibration_max_deviation(preds, labels, k=10, min_n=200):
    """Max |meanPred - meanLabel| over bins with n>=min_n — the gate metric
    (metrics.ts checkGates uses k=10 bins, min 200 samples, threshold 0.1)."""
    agg = [{"pred": 0.0, "label": 0.0, "n": 0} for _ in range(k)]
    for p, y in zip(preds, labels):
        idx = min(k - 1, int(p * k))
        agg[idx]["pred"] += p
        agg[idx]["label"] += y
        agg[idx]["n"] += 1
    worst = 0.0
    for b in agg:
        if b["n"] < min_n:
            continue
        dev = abs(b["pred"] / b["n"] - b["label"] / b["n"])
        worst = max(worst, dev)
    return worst


import numpy as np
import pandas as pd

META_COLS = 3          # matchId, roundId, label
BASE_FEATURES = 21     # shipped LR feature count (first 21 columns)


def load_matrix(path, n_features=None):
    """Returns (match_ids, X, y, feature_names). n_features slices the leading
    feature columns (21 -> shipped set; None -> all 123)."""
    df = pd.read_csv(path)
    feat_cols = list(df.columns[META_COLS:])
    if n_features is not None:
        feat_cols = feat_cols[:n_features]
    return (
        df["matchId"].to_numpy(),
        df[feat_cols].to_numpy(dtype=float),
        df["label"].to_numpy(dtype=int),
        feat_cols,
    )


def grouped_cv_predict(match_ids, X, y, fit_predict, k=5):
    """k grouped folds (folds by group_fold(matchId)); fit_predict(X_tr, y_tr,
    X_val) -> val probabilities. Returns pooled (preds, labels)."""
    folds = np.array([group_fold(int(m), k) for m in match_ids])
    pooled_preds, pooled_labels = [], []
    for f in range(k):
        tr, val = folds != f, folds == f
        if val.sum() == 0 or tr.sum() == 0:
            continue
        preds = fit_predict(X[tr], y[tr], X[val])
        pooled_preds.extend(np.asarray(preds).tolist())
        pooled_labels.extend(y[val].tolist())
    return np.array(pooled_preds), np.array(pooled_labels)


def calibrated_metrics(preds, labels):
    """Calibrate on pooled holdout (as the TS pipeline does) and report."""
    cal = fit_calibration(preds.tolist(), labels.tolist())
    cp = np.array([apply_calibration(cal, float(p)) for p in preds])
    return {
        "log_loss": log_loss(cp.tolist(), labels.tolist()),
        "brier": brier(cp.tolist(), labels.tolist()),
        "cal_max_dev": calibration_max_deviation(cp.tolist(), labels.tolist()),
        "n": int(len(labels)),
        "calibrated_preds": cp,
    }


def lr_fit_predict(X_tr, y_tr, X_val):
    """Standardized logistic regression — the LR control."""
    from sklearn.preprocessing import StandardScaler
    from sklearn.linear_model import LogisticRegression
    sc = StandardScaler().fit(X_tr)
    clf = LogisticRegression(max_iter=1000, C=1.0).fit(sc.transform(X_tr), y_tr)
    return clf.predict_proba(sc.transform(X_val))[:, 1]


SHIPPED_LR = {  # corrected LR (model-v2) calibrated CV log loss, for trust check
    "control": 0.6180,
    "escort_hybrid": 0.6635,
    "flashpoint": 0.5891,
}
TOLERANCE = 0.006


def self_validate(data_dir="data"):
    import os
    ok = True
    for fam, expected in SHIPPED_LR.items():
        match_ids, X, y, _ = load_matrix(
            os.path.join(data_dir, f"dataset-{fam}.csv"), BASE_FEATURES
        )
        preds, labels = grouped_cv_predict(match_ids, X, y, lr_fit_predict)
        m = calibrated_metrics(preds, labels)
        delta = m["log_loss"] - expected
        status = "OK" if abs(delta) <= TOLERANCE else "MISMATCH"
        if status == "MISMATCH":
            ok = False
        print(f"[{status}] {fam}: harness LR {m['log_loss']:.4f} "
              f"vs shipped {expected:.4f} (delta {delta:+.4f})")
    return ok


if __name__ == "__main__":
    import sys
    if not self_validate():
        print("\nHarness LR does not reproduce the shipped LR — comparison untrustworthy.")
        sys.exit(1)
    print("\nHarness validated.")
