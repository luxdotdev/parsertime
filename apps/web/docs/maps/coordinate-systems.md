# Coordinate Systems

## 1. World Space (Game Coordinates)

- Format: `(x, y, z)`
- Units: game-defined (usually meters or units)
- Origin: map-specific
- Axes:
  - X: horizontal
  - Y: horizontal (perpendicular to X)
  - Z: vertical (height)

For top-down mapping:

- Use `(x, y)`
- Ignore or filter by `z`

---

## 2. Image Space (Pixel Coordinates)

- Format: `(u, v)`
- Origin: top-left
- Axes:
  - u: left → right
  - v: top → bottom
- Resolution: e.g. `4096 × 4096`

---

## Key Differences

| Property    | World Space  | Image Space |
| ----------- | ------------ | ----------- |
| Origin      | arbitrary    | top-left    |
| Y Direction | up           | down        |
| Units       | meters/units | pixels      |
| Rotation    | arbitrary    | fixed       |

---

## Implication

You must:

- Translate origin
- Flip Y axis
- Scale units → pixels
- Possibly rotate
