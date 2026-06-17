"""Builds the merged GBM artifact locally: per mode, champion/challenger vs the
live R2 artifact (if reachable); writes artifacts/wp/model-gbm.json. No upload."""
import json
import os
import urllib.request
from train_gbm import train_family

FAMILIES = ["control", "escort_hybrid", "flashpoint"]
LATEST_MODEL_URL = os.environ.get("WP_LATEST_MODEL_URL")  # public URL of the live model JSON, or unset

def load_incumbents():
    if not LATEST_MODEL_URL:
        print("WP_LATEST_MODEL_URL unset — treating all modes as no-incumbent (first GBM)")
        return {}
    try:
        with urllib.request.urlopen(LATEST_MODEL_URL) as r:
            art = json.load(r)
        return {f: art["modeFamilies"].get(f) for f in FAMILIES}
    except Exception as e:
        print(f"incumbent load failed ({e}) — treating as no-incumbent")
        return {}

def main():
    incumbents = load_incumbents()
    families = {"control": None, "escort_hybrid": None, "push": None, "flashpoint": None}
    for fam in FAMILIES:
        chosen = train_family(f"data/dataset-{fam}.csv", incumbents.get(fam))
        families[fam] = chosen
        print(f"{fam}: shipped {chosen['kind']} logLoss={chosen['metrics']['logLoss']:.4f}")
    artifact = {
        "schemaVersion": 1, "modelVersion": 0,
        "createdAt": "PLACEHOLDER",
        "featureHash": os.environ["WP_FEATURE_HASH"],
        "modeFamilies": families,
    }
    out = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "artifacts", "wp", "model-gbm.json"))
    with open(out, "w") as fh:
        json.dump(artifact, fh)
    print(f"wrote {out}")

if __name__ == "__main__":
    main()
