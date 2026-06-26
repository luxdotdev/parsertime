"""Scores ~200 real rows per mode through the Python serving path (the same
serialize._tree_leaf + sigmoid + isotonic the artifact ships) and writes
data/py_preds_<mode>.json = [{row: [...21 floats], p: prob}] for the TS parity
check to reproduce. Reads artifacts/wp/model-gbm.json. No DB, no network."""
import json
import math
import os

import pandas as pd

from harness import apply_calibration
from serialize import _tree_leaf

FAMILIES = ["control", "escort_hybrid", "flashpoint"]
META_COLS = 3
BASE_FEATURES = 21
N_ROWS = 200


def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-z))


def gbm_raw_score(family, row):
    s = family["baseScore"]
    for tree in family["trees"]:
        s += _tree_leaf(tree, row)
    return s


def main():
    here = os.path.dirname(__file__)
    art_path = os.path.abspath(
        os.path.join(here, "..", "..", "..", "artifacts", "wp", "model-gbm.json")
    )
    artifact = json.load(open(art_path))
    for fam in FAMILIES:
        family = artifact["modeFamilies"][fam]
        assert family is not None and family["kind"] == "gbm", fam
        df = pd.read_csv(os.path.join(here, "data", f"dataset-{fam}.csv"))
        feat_cols = list(df.columns[META_COLS : META_COLS + BASE_FEATURES])
        sub = df[feat_cols].head(N_ROWS).to_numpy(dtype=float)
        cal = family["calibration"]
        out = []
        for r in sub:
            raw = sigmoid(gbm_raw_score(family, r))
            p = apply_calibration(cal, raw)
            out.append({"row": [float(v) for v in r], "p": float(p)})
        dst = os.path.join(here, "data", f"py_preds_{fam}.json")
        with open(dst, "w") as fh:
            json.dump(out, fh)
        print(f"{fam}: wrote {len(out)} preds -> {dst}")


if __name__ == "__main__":
    main()
