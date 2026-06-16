"""Batch map render re-alignment.

Loops every map that has BOTH a reference image (the currently-calibrated one)
and a new render, aligns each pair, and writes:

  <out>/transforms.json   - { "<map>": { pixelAffine, inliers, residual, lowConfidence } }
  <out>/overlays/<map>.png - edge-overlay QA image (new=green, warped-old=magenta)

plus a summary table on stdout. Nothing is written to the database or R2 — apply
each map in the admin Replace-render dialog by pasting transforms[<map>].

Usage:
    cd scripts/map-align
    uv run batch.py <reference_dir> <final_dir> [--out ./map-align-out]

Example:
    uv run batch.py ~/code/map-models/reference-images ~/code/map-models/final-renders
"""
import argparse
import json
import os
import sys

import cv2

from align import (
    ALIGN_TARGET_PX,
    AlignError,
    align_images,
    decode_bounded,
    edge_overlay,
    rescale_transform,
)

# Mirror the dialog's informational thresholds (original-pixel residual / inliers).
LOW_CONFIDENCE_RESIDUAL = 5.0
LOW_CONFIDENCE_INLIERS = 25


def _png_stems(directory):
    """Map { filename-without-extension: full path } for PNGs in a directory."""
    out = {}
    for name in os.listdir(directory):
        if name.lower().endswith(".png"):
            out[os.path.splitext(name)[0]] = os.path.join(directory, name)
    return out


def _align_pair(old_path, new_path, overlay_path):
    """Align one pair, write its overlay, and return its manifest entry + row."""
    with open(old_path, "rb") as f:
        old_bytes = f.read()
    with open(new_path, "rb") as f:
        new_bytes = f.read()

    old_small, scale_old = decode_bounded(old_bytes, ALIGN_TARGET_PX)
    new_small, scale_new = decode_bounded(new_bytes, ALIGN_TARGET_PX)
    transform_small, inliers, residual_small = align_images(old_small, new_small)

    full = rescale_transform(transform_small, scale_old, scale_new)
    residual = residual_small / scale_new
    low_confidence = (
        residual > LOW_CONFIDENCE_RESIDUAL or inliers < LOW_CONFIDENCE_INLIERS
    )

    overlay = edge_overlay(old_small, new_small, transform_small)
    cv2.imwrite(overlay_path, overlay)

    a, b, tx = full[0]
    c, d, ty = full[1]
    entry = {
        "pixelAffine": {"a": a, "b": b, "c": c, "d": d, "tx": tx, "ty": ty},
        "inliers": inliers,
        "residual": round(residual, 3),
        "lowConfidence": low_confidence,
    }
    return entry, low_confidence, inliers, round(residual, 3)


def run_batch(reference_dir, final_dir, out_dir):
    """Align every reference/final pair. Writes transforms.json + overlays under
    out_dir. Returns a summary dict: { transforms, rows, out_dir }.

    rows is a list of { map, status, inliers, residual, flag } for the summary
    table (and for tests) covering matched, skipped, and failed maps.
    """
    refs = _png_stems(reference_dir)
    finals = _png_stems(final_dir)
    overlays_dir = os.path.join(out_dir, "overlays")
    os.makedirs(overlays_dir, exist_ok=True)

    transforms = {}
    rows = []

    for name in sorted(set(refs) - set(finals)):
        rows.append(_row(name, "skipped: no new render"))
    for name in sorted(set(finals) - set(refs)):
        rows.append(_row(name, "skipped: no reference image"))

    for name in sorted(set(refs) & set(finals)):
        overlay_path = os.path.join(overlays_dir, name + ".png")
        try:
            entry, low, inliers, residual = _align_pair(
                refs[name], finals[name], overlay_path
            )
            transforms[name] = entry
            rows.append(
                _row(
                    name,
                    "ok",
                    inliers=inliers,
                    residual=residual,
                    flag="LOW CONFIDENCE" if low else "",
                )
            )
        except AlignError as e:
            rows.append(_row(name, f"failed: {e}", flag="FAILED"))
        except Exception as e:  # noqa: BLE001 - report and continue the batch
            rows.append(_row(name, f"error: {e}", flag="ERROR"))

    with open(os.path.join(out_dir, "transforms.json"), "w") as f:
        json.dump(transforms, f, indent=2)

    return {"transforms": transforms, "rows": rows, "out_dir": out_dir}


def _row(name, status, inliers="", residual="", flag=""):
    return {
        "map": name,
        "status": status,
        "inliers": inliers,
        "residual": residual,
        "flag": flag,
    }


def _print_summary(summary):
    rows = summary["rows"]
    name_w = max([len("map")] + [len(r["map"]) for r in rows], default=3)
    status_w = max([len("status")] + [len(str(r["status"])) for r in rows], default=6)
    header = f"{'map':<{name_w}}  {'status':<{status_w}}  {'inliers':>7}  {'residual':>8}  flag"
    print(header)
    print("-" * len(header))
    for r in rows:
        print(
            f"{r['map']:<{name_w}}  {str(r['status']):<{status_w}}  "
            f"{str(r['inliers']):>7}  {str(r['residual']):>8}  {r['flag']}"
        )

    ok = sum(1 for r in rows if r["status"] == "ok")
    low = sum(1 for r in rows if r["flag"] == "LOW CONFIDENCE")
    failed = sum(1 for r in rows if r["flag"] in ("FAILED", "ERROR"))
    skipped = sum(1 for r in rows if str(r["status"]).startswith("skipped"))
    print(
        f"\n{ok} aligned ({low} low-confidence), {failed} failed, {skipped} skipped."
    )
    print(f"transforms.json + overlays/ written to {summary['out_dir']}")


def main():
    parser = argparse.ArgumentParser(
        description="Align every reference/final map render pair and write a "
        "transforms manifest + review overlays."
    )
    parser.add_argument("reference_dir", help="directory of currently-calibrated images")
    parser.add_argument("final_dir", help="directory of new renders")
    parser.add_argument(
        "--out",
        default="./map-align-out",
        help="output directory (default: ./map-align-out)",
    )
    args = parser.parse_args()
    summary = run_batch(args.reference_dir, args.final_dir, args.out)
    _print_summary(summary)
    return 0


if __name__ == "__main__":
    sys.exit(main())
