import numpy as np
import cv2
import pytest

from align import align_images, AlignError, decode_bounded, rescale_transform, align_bounded


def _synthetic_map(seed=0):
    """Deterministic feature-rich image to register against."""
    rng = np.random.default_rng(seed)
    img = np.full((400, 400, 3), 240, dtype=np.uint8)
    for _ in range(60):
        x, y = int(rng.integers(20, 360)), int(rng.integers(20, 360))
        w, h = int(rng.integers(10, 50)), int(rng.integers(10, 50))
        color = tuple(int(c) for c in rng.integers(0, 200, size=3))
        cv2.rectangle(img, (x, y), (x + w, y + h), color, -1)
    for _ in range(40):
        x, y = int(rng.integers(20, 380)), int(rng.integers(20, 380))
        r = int(rng.integers(5, 25))
        color = tuple(int(c) for c in rng.integers(0, 200, size=3))
        cv2.circle(img, (x, y), r, color, -1)
    return img


def test_recovers_known_affine_despite_photometric_change():
    old = _synthetic_map(seed=1)

    # Known affine: small rotation + scale + translation.
    M = cv2.getRotationMatrix2D((200, 200), 4.0, 1.06)
    M[0, 2] += 9.0
    M[1, 2] += -6.0
    warped = cv2.warpAffine(old, M, (400, 400), borderValue=(0, 0, 0))

    # Heavy photometric change: invert colors + black out a border (mimic the
    # render pass differences — different palette, black out-of-bounds mask).
    new = 255 - warped
    new[:30, :] = 0
    new[-30:, :] = 0

    P, inliers, residual = align_images(old, new)

    assert inliers >= 20
    assert residual < 2.0

    # P must reproduce the known mapping on test points.
    pts = np.array([[100, 100], [300, 120], [150, 320], [250, 250]], dtype=np.float64)
    expected = (M[:, :2] @ pts.T).T + M[:, 2]
    got = (np.array(P)[:, :2] @ pts.T).T + np.array(P)[:, 2]
    err = np.sqrt(((got - expected) ** 2).sum(axis=1)).max()
    assert err < 2.0


def test_raises_on_unalignable_inputs():
    old = _synthetic_map(seed=2)
    new = np.zeros((400, 400, 3), dtype=np.uint8)  # featureless
    with pytest.raises(AlignError):
        align_images(old, new)


def test_decode_bounded_downscales_large_png():
    # 4096px synthetic PNG -> reduced-decode should bound it to <= 2048.
    base = _synthetic_map(seed=5)
    big = cv2.resize(base, (4096, 4096), interpolation=cv2.INTER_NEAREST)
    ok, buf = cv2.imencode(".png", big)
    assert ok
    img, scale = decode_bounded(buf.tobytes(), target=2048)
    assert max(img.shape[:2]) <= 2048
    # decoded long edge / original long edge
    assert scale == pytest.approx(max(img.shape[:2]) / 4096, rel=0.02)


def test_decode_bounded_passthrough_small():
    # A 400px image is already under target -> returned unchanged, scale 1.0.
    base = _synthetic_map(seed=6)
    ok, buf = cv2.imencode(".png", base)
    assert ok
    img, scale = decode_bounded(buf.tobytes(), target=2048)
    assert img.shape[:2] == (400, 400)
    assert scale == 1.0


def test_rescale_transform_math():
    # old downscaled by 0.25, new by 0.5; identity in small space ->
    # full-space transform scales old_full -> new_full by 0.5.
    P = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]
    full = rescale_transform(P, 0.25, 0.5)
    assert full[0][0] == pytest.approx(0.5)
    assert full[1][1] == pytest.approx(0.5)
    assert full[0][2] == pytest.approx(0.0)
    # a translation in small-new space scales by 1/scale_new
    P2 = [[1.0, 0.0, 10.0], [0.0, 1.0, -4.0]]
    full2 = rescale_transform(P2, 0.5, 0.5)
    assert full2[0][2] == pytest.approx(20.0)
    assert full2[1][2] == pytest.approx(-8.0)


def test_align_bounded_recovers_scaled_affine_from_bytes():
    # old_full is 4096px; new_full is produced by a KNOWN affine that includes a
    # 0.5 scale into a 2048 canvas, plus a photometric inversion. align_bounded
    # must recover P (old_full -> new_full) in ORIGINAL pixel space.
    base = _synthetic_map(seed=7)
    old_full = cv2.resize(base, (4096, 4096), interpolation=cv2.INTER_NEAREST)

    # Known old_full -> new_full affine: rotate ~3 deg about (2048,2048), scale 0.5.
    theta = np.deg2rad(3.0)
    s = 0.5
    cos, sin = np.cos(theta) * s, np.sin(theta) * s
    cx, cy = 2048.0, 2048.0
    M = np.array([
        [cos, -sin, cx - cos * cx + sin * cy],
        [sin,  cos, cy - sin * cx - cos * cy],
    ], dtype=np.float64)
    new_full = cv2.warpAffine(old_full, M, (2048, 2048), borderValue=(0, 0, 0))
    new_full = 255 - new_full  # photometric change

    ok1, ob = cv2.imencode(".png", old_full)
    ok2, nb = cv2.imencode(".png", new_full)
    assert ok1 and ok2

    P, inliers, residual = align_bounded(ob.tobytes(), nb.tobytes(), target=2048)
    assert inliers >= 20

    pts = np.array([[500, 500], [3000, 800], [1500, 3500], [2048, 2048]], dtype=np.float64)
    expected = (M[:, :2] @ pts.T).T + M[:, 2]
    Pn = np.array(P, dtype=np.float64)
    got = (Pn[:, :2] @ pts.T).T + Pn[:, 2]
    err = np.sqrt(((got - expected) ** 2).sum(axis=1)).max()
    assert err < 5.0  # within 5 px in new-original space (downscaled-align tolerance)
