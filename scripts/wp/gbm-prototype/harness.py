"""Offline harness for the WP GBM bake-off. Ports the TypeScript grouped-CV
fold, metrics, and isotonic calibration so LR and GBM are judged identically
to the shipped pipeline. Not serving code."""


def group_fold(match_id: int, k: int) -> int:
    """FNV-1a over the decimal matchId string, mod k — matches cv.ts groupFold.
    32-bit unsigned arithmetic via & 0xFFFFFFFF (mirrors Math.imul + >>> 0)."""
    s = str(match_id)
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h % k
