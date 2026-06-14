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
