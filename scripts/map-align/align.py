"""Pure image-registration helpers for the map-align local CLI.

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
ALIGN_TARGET_PX = 2048    # working resolution cap; keeps memory bounded across 4K/8K inputs
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


def _png_dimensions(data):
    """Return (width, height) from a PNG header, or None if not a PNG.

    PNG is an 8-byte signature followed by the IHDR chunk whose width/height are
    big-endian uint32 at byte offsets 16 and 20. Reading dimensions up front lets
    us pick a reduced-resolution decode instead of materialising a huge raster.
    """
    if len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n":
        width = int.from_bytes(data[16:20], "big")
        height = int.from_bytes(data[20:24], "big")
        if width > 0 and height > 0:
            return width, height
    return None


def decode_bounded(data, target=ALIGN_TARGET_PX):
    """Decode image bytes to a BGR array whose long edge is <= target.

    Large PNGs are decoded at a reduced resolution (cv2 IMREAD_REDUCED_*) so the
    full raster is never allocated (an 8K render decodes straight to ~2048px, not
    ~200MB), then resized to the exact target. This bounds memory and normalises
    scale so feature matching works across mismatched resolutions.

    Returns (img, scale) where scale = decoded_long_edge / original_long_edge
    (<= 1.0), used later to map the transform back to original pixels.
    """
    dims = _png_dimensions(data)
    arr = np.frombuffer(data, dtype=np.uint8)

    if dims is not None:
        orig_long = max(dims)
        reduce_factor = 1
        for factor in (8, 4, 2):
            if orig_long // factor >= target:
                reduce_factor = factor
                break
        flag = {
            1: cv2.IMREAD_COLOR,
            2: cv2.IMREAD_REDUCED_COLOR_2,
            4: cv2.IMREAD_REDUCED_COLOR_4,
            8: cv2.IMREAD_REDUCED_COLOR_8,
        }[reduce_factor]
        img = cv2.imdecode(arr, flag)
    else:
        # Non-PNG (no IHDR to read dimensions from): decode at full resolution,
        # then resize below. The upload pipeline always re-encodes to PNG, so in
        # production this branch is unreachable; a very large non-PNG input would
        # allocate its full raster here before the downscale.
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        orig_long = None

    if img is None:
        raise AlignError("could not decode image")

    if orig_long is None:
        orig_long = max(img.shape[:2])

    height, width = img.shape[:2]
    long_edge = max(height, width)
    if long_edge > target:
        s = target / long_edge
        img = cv2.resize(
            img,
            (max(1, round(width * s)), max(1, round(height * s))),
            interpolation=cv2.INTER_AREA,
        )

    scale = max(img.shape[:2]) / orig_long
    return img, scale


def rescale_transform(transform, scale_old, scale_new):
    """Map a 2x3 affine computed on downscaled images back to original pixels.

    `transform` maps old_small -> new_small. The composition is:
      old_full --(*scale_old)--> old_small --transform--> new_small --(/scale_new)--> new_full
    """
    f = scale_old / scale_new
    a, b, tx = transform[0]
    c, d, ty = transform[1]
    return [[a * f, b * f, tx / scale_new], [c * f, d * f, ty / scale_new]]


def align_bounded(old_bytes, new_bytes, target=ALIGN_TARGET_PX):
    """Decode both images memory-bounded, align, and return the transform in
    ORIGINAL pixel space (old original -> new original).

    Returns (P, inliers, residual): P is a 2x3 list old_original -> new_original,
    residual is mean reprojection error in NEW-original pixels.
    """
    old_img, scale_old = decode_bounded(old_bytes, target)
    new_img, scale_new = decode_bounded(new_bytes, target)
    transform, inliers, residual = align_images(old_img, new_img)
    full = rescale_transform(transform, scale_old, scale_new)
    return full, inliers, residual / scale_new
