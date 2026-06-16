import numpy as np
import cv2
import pytest

from align import align_images, AlignError


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
