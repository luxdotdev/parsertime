"""Serialize a trained LightGBM booster into the artifact tree schema the TS
serving path consumes. Raw score = baseScore + sum of reached leaf values;
sigmoid + isotonic are applied downstream. baseScore captures LightGBM's
boost-from-average init offset (a constant), derived empirically and asserted."""
import numpy as np


def _flatten(node, out):
    if "leaf_value" in node:
        out.append({"leaf": float(node["leaf_value"])})
        return len(out) - 1
    assert node.get("decision_type", "<=") == "<=", "only numeric <= splits supported"
    idx = len(out)
    out.append(None)  # reserve slot before recursing
    left = _flatten(node["left_child"], out)
    right = _flatten(node["right_child"], out)
    out[idx] = {
        "feature": int(node["split_feature"]),
        "threshold": float(node["threshold"]),
        "left": left,
        "right": right,
        "defaultLeft": bool(node["default_left"]),
    }
    return idx


def _tree_leaf(tree, x):
    i = 0
    while True:
        n = tree[i]
        if "leaf" in n:
            return n["leaf"]
        v = x[n["feature"]]
        if v != v:
            i = n["left"] if n["defaultLeft"] else n["right"]
        else:
            i = n["left"] if v <= n["threshold"] else n["right"]


def serialize_booster(booster):
    dumped = booster.dump_model()
    trees = []
    for ti in dumped["tree_info"]:
        nodes = []
        _flatten(ti["tree_structure"], nodes)
        trees.append(nodes)
    # Derive the constant init offset: raw_score - sum(reached leaves).
    n_feat = booster.num_feature()
    probe = np.zeros((8, n_feat))
    for j in range(8):
        probe[j, j % n_feat] = 1.0  # vary inputs so the offset is exercised
    raw = booster.predict(probe, raw_score=True)
    offsets = [raw[r] - sum(_tree_leaf(t, probe[r]) for t in trees) for r in range(8)]
    base = float(np.mean(offsets))
    assert float(np.std(offsets)) < 1e-9, f"init offset not constant: {offsets}"
    return {"trees": trees, "baseScore": base}
