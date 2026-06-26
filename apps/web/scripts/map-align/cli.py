"""Local CLI for map render re-alignment.

Aligns a NEW render to the currently-calibrated (OLD) image and prints the 2x3
pixel transform as JSON, ready to paste into the admin "Replace render" dialog.
Runs locally (where OpenCV installs trivially) instead of on Vercel, where the
~98MB opencv bundle exceeds the Python function size limit.

Usage:
    cd scripts/map-align
    uv run cli.py <old_image> <new_image>

Example:
    uv run cli.py ~/code/map-models/reference-images/aatlis.png \\
                  ~/code/map-models/final-renders/aatlis.png

The OLD image must be the exact image the map was calibrated on (its pixel space
is where the stored anchors live); the NEW image is the render you're swapping in.
Prints, on stdout, JSON of the form:

    { "pixelAffine": { "a", "b", "c", "d", "tx", "ty" },
      "inliers": <int>, "residual": <float> }

Copy that JSON into the dialog to review the re-projected anchors and confirm.
"""
import argparse
import json
import sys

from align import AlignError, align_bounded


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Align a new map render to the calibrated image and print "
        "the pixel transform as JSON for the admin Replace-render dialog."
    )
    parser.add_argument("old_image", help="path to the currently-calibrated (old) image")
    parser.add_argument("new_image", help="path to the new render")
    args = parser.parse_args()

    try:
        with open(args.old_image, "rb") as f:
            old_bytes = f.read()
        with open(args.new_image, "rb") as f:
            new_bytes = f.read()
    except OSError as e:
        print(f"could not read image: {e}", file=sys.stderr)
        return 1

    try:
        transform, inliers, residual = align_bounded(old_bytes, new_bytes)
    except AlignError as e:
        print(f"alignment failed: {e}", file=sys.stderr)
        return 1

    a, b, tx = transform[0]
    c, d, ty = transform[1]
    payload = {
        "pixelAffine": {"a": a, "b": b, "c": c, "d": d, "tx": tx, "ty": ty},
        "inliers": inliers,
        "residual": round(residual, 3),
    }
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
