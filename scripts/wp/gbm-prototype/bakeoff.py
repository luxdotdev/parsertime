"""Runs LR-21, GBM-21, GBM-123 per mode on identical grouped-CV folds; reports
aggregate + decisive-subset metrics and GBM feature importances. Writes
results.json for the findings note. Offline analysis — not serving code."""
import json
import os
import numpy as np

from harness import (
    BASE_FEATURES, load_matrix, grouped_cv_predict, calibrated_metrics,
    lr_fit_predict, self_validate, log_loss, brier,
)

FAMILIES = ["control", "escort_hybrid", "flashpoint"]
DECISIVE_MARGIN = 0.3  # |calibrated pred - 0.5| > 0.3 -> a "decided" state

def make_gbm_fit_predict():
    """LightGBM (preferred) or sklearn HistGradientBoosting fallback. Trees are
    scale-invariant -> no standardization. Conservative params guard the smaller
    flashpoint sample; this is a prototype, not tuned."""
    try:
        from lightgbm import LGBMClassifier
        def fit_predict(X_tr, y_tr, X_val):
            clf = LGBMClassifier(
                n_estimators=400, learning_rate=0.05, num_leaves=31,
                min_child_samples=200, subsample=0.8, subsample_freq=1,
                colsample_bytree=0.8, reg_lambda=1.0, random_state=42,
                n_jobs=-1, verbose=-1,
            ).fit(X_tr, y_tr)
            fit_predict.last_model = clf
            return clf.predict_proba(X_val)[:, 1]
        fit_predict.kind = "lightgbm"
        return fit_predict
    except Exception as e:
        from sklearn.ensemble import HistGradientBoostingClassifier
        print(f"(lightgbm unavailable: {e}; using sklearn HistGradientBoosting)")
        def fit_predict(X_tr, y_tr, X_val):
            clf = HistGradientBoostingClassifier(
                max_iter=400, learning_rate=0.05, max_leaf_nodes=31,
                min_samples_leaf=200, l2_regularization=1.0, random_state=42,
            ).fit(X_tr, y_tr)
            fit_predict.last_model = clf
            return clf.predict_proba(X_val)[:, 1]
        fit_predict.kind = "hist_gbm"
        return fit_predict

def decisive_metrics(metrics, labels):
    cp = metrics["calibrated_preds"]
    mask = np.abs(cp - 0.5) > DECISIVE_MARGIN
    if mask.sum() == 0:
        return {"log_loss": None, "brier": None, "n": 0}
    return {
        "log_loss": log_loss(cp[mask].tolist(), labels[mask].tolist()),
        "brier": brier(cp[mask].tolist(), labels[mask].tolist()),
        "n": int(mask.sum()),
    }

def importances_for_full_model(fit_predict, feat_names, X, y):
    """Train one full-data GBM to read gain importances (top 15)."""
    fit_predict(X, y, X[:1])
    model = fit_predict.last_model
    imp = getattr(model, "feature_importances_", None)
    if imp is None:
        return []
    imp = np.asarray(imp, dtype=float)
    order = np.argsort(imp)[::-1][:15]
    total = float(imp.sum()) or 1.0
    return [{"feature": feat_names[i], "gain_pct": round(100 * imp[i] / total, 2)}
            for i in order]

def run_config(name, path, n_features, fit_predict):
    match_ids, X, y, feat_names = load_matrix(path, n_features)
    preds, labels = grouped_cv_predict(match_ids, X, y, fit_predict)
    agg = calibrated_metrics(preds, labels)
    dec = decisive_metrics(agg, labels)
    out = {
        "config": name,
        "aggregate": {"log_loss": agg["log_loss"], "brier": agg["brier"],
                      "cal_max_dev": agg["cal_max_dev"], "n": agg["n"]},
        "decisive": dec,
    }
    return out, (feat_names, X, y)

def main():
    if not self_validate():
        raise SystemExit("Harness LR does not reproduce shipped LR — aborting.")
    print()
    gbm = make_gbm_fit_predict()
    results = {"gbm_kind": gbm.kind, "decisive_margin": DECISIVE_MARGIN, "families": {}}
    for fam in FAMILIES:
        path = os.path.join("data", f"dataset-{fam}.csv")
        fam_out = {"configs": []}
        lr_out, _ = run_config("LR-21", path, BASE_FEATURES, lr_fit_predict)
        fam_out["configs"].append(lr_out)
        gbm21_out, _ = run_config("GBM-21", path, BASE_FEATURES, gbm)
        fam_out["configs"].append(gbm21_out)
        gbm123_out, full = run_config("GBM-123", path, None, gbm)
        fam_out["configs"].append(gbm123_out)
        feat_names, X, y = full
        fam_out["gbm_123_importances"] = importances_for_full_model(gbm, feat_names, X, y)
        lr_dec = lr_out["decisive"]["log_loss"]
        best_gbm_dec = min(gbm21_out["decisive"]["log_loss"], gbm123_out["decisive"]["log_loss"])
        fam_out["decisive_rel_improvement_pct"] = round(100 * (lr_dec - best_gbm_dec) / lr_dec, 2)
        results["families"][fam] = fam_out
        print(f"\n=== {fam} ===")
        for c in fam_out["configs"]:
            d = c["decisive"]
            print(f"  {c['config']:8s} agg {c['aggregate']['log_loss']:.4f} "
                  f"(dev {c['aggregate']['cal_max_dev']:.3f})  "
                  f"decisive {d['log_loss']:.4f} (n={d['n']})")
        print(f"  decisive rel. improvement best-GBM vs LR: {fam_out['decisive_rel_improvement_pct']}%")
        print(f"  top GBM-123 importances: {fam_out['gbm_123_importances'][:5]}")
    with open("results.json", "w") as fh:
        json.dump(results, fh, indent=2)
    print("\nWrote results.json")

if __name__ == "__main__":
    main()
