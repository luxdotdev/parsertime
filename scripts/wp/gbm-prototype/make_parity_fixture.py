"""Generates test/win-probability/fixtures/gbm-parity.json: a small GBM family
(serialized trees) + sample 21-feature rows + the probabilities LightGBM itself
produces (sigmoid of raw score, no isotonic). The TS parity test asserts TS
inference reproduces these, guarding the tree-traversal port."""
import json
import os
import numpy as np
from lightgbm import LGBMClassifier
from serialize import serialize_booster

N_FEATURES = 21

def main():
    rng = np.random.default_rng(7)
    X = rng.normal(size=(4000, N_FEATURES))
    y = (X[:, 0] - X[:, 6] + 0.5 * X[:, 13] + rng.normal(scale=0.4, size=4000) > 0).astype(int)
    clf = LGBMClassifier(n_estimators=60, num_leaves=16, learning_rate=0.08,
                         min_child_samples=40, random_state=7, verbose=-1).fit(X, y)
    ser = serialize_booster(clf.booster_)
    sample = rng.normal(size=(50, N_FEATURES))
    probs = clf.predict_proba(sample)[:, 1]  # sigmoid(raw); no isotonic
    fixture = {
        "family": {"kind": "gbm", "baseScore": ser["baseScore"], "trees": ser["trees"], "sampleCount": 4000},
        "rows": sample.tolist(),
        "expectedProbs": probs.tolist(),
    }
    out = os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "..", "..",
        "test", "win-probability", "fixtures", "gbm-parity.json"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as fh:
        json.dump(fixture, fh)
    print(f"wrote {out} ({len(probs)} rows, {len(ser['trees'])} trees)")

if __name__ == "__main__":
    main()
