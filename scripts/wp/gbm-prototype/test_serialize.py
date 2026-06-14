import numpy as np
from lightgbm import LGBMClassifier
from serialize import serialize_booster

def _leaf(tree, x):
    i = 0
    while True:
        n = tree[i]
        if "leaf" in n:
            return n["leaf"]
        v = x[n["feature"]]
        if v != v:  # NaN
            i = n["left"] if n["defaultLeft"] else n["right"]
        else:
            i = n["left"] if v <= n["threshold"] else n["right"]

def test_serialized_trees_reproduce_lightgbm_raw_score():
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2000, 6))
    y = (X[:, 0] + 0.5 * X[:, 1] - X[:, 3] + rng.normal(scale=0.3, size=2000) > 0).astype(int)
    clf = LGBMClassifier(n_estimators=30, num_leaves=8, learning_rate=0.1,
                         min_child_samples=20, random_state=0, verbose=-1).fit(X, y)
    art = serialize_booster(clf.booster_)
    lgb_raw = clf.booster_.predict(X[:200], raw_score=True)
    for r in range(200):
        ours = art["baseScore"] + sum(_leaf(tree, X[r]) for tree in art["trees"])
        assert abs(ours - lgb_raw[r]) < 1e-9
