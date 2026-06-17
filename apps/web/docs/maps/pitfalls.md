# Common Pitfalls

## 1. Ignoring Z (Height)

- Multi-level maps overlap incorrectly
- Solution:
  - Filter by Z ranges
  - Or create per-floor maps

---

## 2. Incorrect Bounds

- Causes scaling issues
- Fix:
  - Use real gameplay data
  - Avoid guessing

---

## 3. Cropped Map Images

- Image does not match world extents
- Fix:
  - Adjust bounds to match image

---

## 4. Rotation Assumptions

- Maps are rarely perfectly aligned
- Always verify rotation

---

## 5. Non-Uniform Scaling

- Causes distortion
- Always use uniform scale

---

## 6. Coordinate Drift

- Caused by:
  - incorrect origin
  - floating point error
- Validate with multiple anchors
