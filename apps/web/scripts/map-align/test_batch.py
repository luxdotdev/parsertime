import json
import os

import cv2
import numpy as np

from batch import run_batch


def _feature_image(seed, size):
    rng = np.random.default_rng(seed)
    img = np.full((size, size, 3), 240, dtype=np.uint8)
    for _ in range(90):
        x, y = int(rng.integers(8, size - 48)), int(rng.integers(8, size - 48))
        w, h = int(rng.integers(8, 44)), int(rng.integers(8, 44))
        color = tuple(int(c) for c in rng.integers(0, 200, size=3))
        cv2.rectangle(img, (x, y), (x + w, y + h), color, -1)
    for _ in range(60):
        x, y = int(rng.integers(8, size - 8)), int(rng.integers(8, size - 8))
        r = int(rng.integers(4, 22))
        color = tuple(int(c) for c in rng.integers(0, 200, size=3))
        cv2.circle(img, (x, y), r, color, -1)
    return img


def _write_png(path, img):
    ok, buf = cv2.imencode(".png", img)
    assert ok
    with open(path, "wb") as f:
        f.write(buf.tobytes())


def test_run_batch_aligns_skips_and_flags(tmp_path):
    ref_dir = tmp_path / "ref"
    ref_dir.mkdir()
    fin_dir = tmp_path / "fin"
    fin_dir.mkdir()
    out_dir = tmp_path / "out"

    # Aligned pair: the final render is a known scaled+rotated, photometrically
    # inverted version of the reference (mimics a new render pass at half size).
    base = _feature_image(1, 1024)
    M = cv2.getRotationMatrix2D((512, 512), 3.0, 0.5)
    new = 255 - cv2.warpAffine(base, M, (512, 512), borderValue=(0, 0, 0))
    _write_png(ref_dir / "alpha.png", base)
    _write_png(fin_dir / "alpha.png", new)

    # Unalignable pair: a featureless (blank) final render.
    _write_png(ref_dir / "beta.png", _feature_image(2, 512))
    _write_png(fin_dir / "beta.png", np.zeros((512, 512, 3), dtype=np.uint8))

    # Reference-only and final-only maps (should be skipped, not failed).
    _write_png(ref_dir / "gamma.png", _feature_image(3, 256))
    _write_png(fin_dir / "delta.png", _feature_image(4, 256))

    summary = run_batch(str(ref_dir), str(fin_dir), str(out_dir))

    # alpha aligned, with all six affine fields and an overlay on disk.
    assert "alpha" in summary["transforms"]
    entry = summary["transforms"]["alpha"]
    assert set(entry["pixelAffine"]) == {"a", "b", "c", "d", "tx", "ty"}
    assert os.path.exists(out_dir / "overlays" / "alpha.png")

    # beta could not align -> absent from the manifest.
    assert "beta" not in summary["transforms"]

    # transforms.json on disk matches the returned manifest.
    with open(out_dir / "transforms.json") as f:
        on_disk = json.load(f)
    assert "alpha" in on_disk and "beta" not in on_disk

    rows = {r["map"]: r for r in summary["rows"]}
    assert rows["alpha"]["status"] == "ok"
    assert rows["beta"]["flag"] in ("FAILED", "ERROR")
    assert rows["gamma"]["status"].startswith("skipped")  # reference-only
    assert rows["delta"]["status"].startswith("skipped")  # final-only
