# Map render re-alignment

Local CLI that aligns a **new** map render to the **currently-calibrated** image,
so an updated render (e.g. a new seasonal pass) can replace the old one without
losing calibration. It computes the old→new pixel transform via OpenCV feature
matching and prints it as JSON to paste into the admin **Replace render** dialog.

This runs locally rather than as a Vercel function: OpenCV is a ~98MB native
dependency that exceeds the Vercel Python bundle size limit. Everything else
(staging, the anchor-overlay review, backup, remap, promote, revert) stays in the
app — the CLI only produces the transform.

## Run

```bash
cd scripts/map-align
uv run cli.py <old_image> <new_image>
```

- `old_image` — the exact image the map was calibrated on (its pixel space is
  where the stored anchors live).
- `new_image` — the new render you're swapping in.

Example:

```bash
uv run cli.py ~/code/map-models/reference-images/aatlis.png \
              ~/code/map-models/final-renders/aatlis.png
```

Output (stdout):

```json
{
  "pixelAffine": { "a": ..., "b": ..., "c": ..., "d": ..., "tx": ..., "ty": ... },
  "inliers": 51,
  "residual": 0.232
}
```

## Batch (many maps at once)

`batch.py` aligns every map that has both a reference image and a new render,
so you don't run the CLI 40 times. It writes a manifest + review overlays and
prints a summary table. It does NOT touch the database or R2 — you still apply
each map in the dialog by pasting its transform.

```bash
cd scripts/map-align
uv run batch.py <reference_dir> <final_dir> [--out ./map-align-out]
```

Example:

```bash
uv run batch.py ~/code/map-models/reference-images ~/code/map-models/final-renders
```

Outputs (under `--out`, default `./map-align-out`):

- `transforms.json` — keyed by map name; each value is the
  `{ pixelAffine, inliers, residual, lowConfidence }` object the dialog parses.
  Maps that fail to align are omitted. To apply one map: open it in the dialog,
  upload its render, and paste `transforms["<map>"]`.
- `overlays/<map>.png` — alignment-QA image: new-render edges in **green**,
  warped-old edges in **magenta**, over a dim copy of the new render. Where the
  alignment is good the strong structural edges coincide and read **white**;
  real misalignment shows as parallel green/magenta fringes on those structures.
  (Green/magenta in areas where the two render passes simply have different
  content/detail is expected and not a misalignment.)
- A stdout summary table: `map | status | inliers | residual | flag`.

**Read the flags.** `LOW CONFIDENCE` (residual > 5px or inliers < 25) and
`failed` maps are still surfaced but warrant a careful overlay check — or just
re-anchor those maps manually in the editor. Maps present only in one directory
are reported as skipped.

## Then, in the app

1. Open the map's calibration editor (`/map-calibration/<mapName>`) and click
   **Replace render**.
2. Upload the same new render.
3. Paste the JSON above.
4. Review the old anchors re-projected onto the new render (and the blink/swipe
   compare). `inliers` (higher is better) and `residual` (lower is better, in
   original pixels) are shown to inform — they never gate the decision.
5. **Confirm** to back up the prior state, remap the anchors, re-derive the
   affine, and promote the new image. **Revert last swap** undoes it.

## How it works

Both images are decoded **memory-bounded** to a common 2048px working size
(OpenCV reduced-resolution decode), aligned with ORB feature matching on Canny
edge maps + RANSAC (robust to the heavy color/background differences between
render passes), and the resulting affine is rescaled back to the original pixel
space. This handles high-resolution renders (8K/4K) that would otherwise blow
memory and break feature matching across a scale gap.

## Tests

```bash
cd scripts/map-align
uv run --no-project --with opencv-python-headless --with numpy --with pytest python -m pytest -v
```
