"""Pure image-registration helpers for the map-align serverless function.

Computes a 2x3 affine P mapping OLD-image pixels -> NEW-image pixels via ORB
feature matching + RANSAC on Canny edge maps.

Feature matching (not phase correlation / ECC) is required because successive
render passes differ heavily in color, lighting and background masking; building
edges/corners are the stable signal. Matching on Canny edge maps rather than
raw grayscale makes the descriptors photometrically invariant — edge positions
are identical regardless of color inversion or brightness shifts.
"""
import cv2
import numpy as np

ORB_N_FEATURES = 5000     # generous upper bound for feature-rich renders
LOWE_RATIO = 0.75         # Lowe (2004) ratio test threshold
CANNY_LOW = 50            # Canny hysteresis thresholds
CANNY_HIGH = 150
RANSAC_REPROJ_PX = 3.0    # px; tight because renders are pixel-exact
MIN_GOOD_MATCHES = 10
MIN_INLIERS = 8


class AlignError(Exception):
    """Raised when the two images cannot be reliably aligned."""


def _to_edges(bgr: np.ndarray) -> np.ndarray:
    """Return a photometric-invariant Canny edge map for descriptor matching.

    Edges sit at the same positions regardless of color/brightness, so ORB
    descriptors survive the render pass's palette/background change.
    """
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    return cv2.Canny(gray, CANNY_LOW, CANNY_HIGH)


def align_images(old_bgr: np.ndarray, new_bgr: np.ndarray):
    """Return (P, inliers, residual).

    P        - 2x3 list-of-lists affine, old pixels -> new pixels.
    inliers  - number of RANSAC inlier matches.
    residual - mean reprojection error (px) over inliers.

    Raises AlignError if the images cannot be reliably aligned.
    """
    old_edges = _to_edges(old_bgr)
    new_edges = _to_edges(new_bgr)

    orb = cv2.ORB_create(nfeatures=ORB_N_FEATURES)
    k1, d1 = orb.detectAndCompute(old_edges, None)
    k2, d2 = orb.detectAndCompute(new_edges, None)
    if d1 is None or d2 is None or len(k1) < 4 or len(k2) < 4:
        raise AlignError("not enough features detected")

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
    knn = matcher.knnMatch(d1, d2, k=2)
    good = []
    for pair in knn:
        if len(pair) == 2:
            m, n = pair
            if m.distance < LOWE_RATIO * n.distance:
                good.append(m)
    if len(good) < MIN_GOOD_MATCHES:
        raise AlignError("too few good matches (%d)" % len(good))

    src = np.float32([k1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)

    P, inlier_mask = cv2.estimateAffine2D(
        src, dst, method=cv2.RANSAC, ransacReprojThreshold=RANSAC_REPROJ_PX,
        maxIters=5000, confidence=0.999,
    )
    if P is None or inlier_mask is None:
        raise AlignError("affine estimation failed")

    mask = inlier_mask.ravel().astype(bool)
    n_inliers = int(mask.sum())
    if n_inliers < MIN_INLIERS:
        raise AlignError("too few inliers (%d)" % n_inliers)

    src_in = src.reshape(-1, 2)[mask]
    dst_in = dst.reshape(-1, 2)[mask]
    proj = (P[:, :2] @ src_in.T).T + P[:, 2]
    residual = float(np.sqrt(((proj - dst_in) ** 2).sum(axis=1)).mean())

    return P.tolist(), n_inliers, residual
