# Calibration

Calibration determines the transform parameters for a map.

---

## Approach 1 — Bounding Box (Fast)

### Steps

1. Collect gameplay position data
2. Compute:

```

minX, maxX
minY, maxY

```

3. Compute scale:

```

scaleX = imageWidth / (maxX - minX)
scaleY = imageHeight / (maxY - minY)
scale = min(scaleX, scaleY)

```

4. Set origin:

```

origin = { x: minX, y: minY }

```

---

## Approach 2 — Anchor Points (Recommended)

Use known correspondences:

| World    | Image    |
| -------- | -------- |
| (x1, y1) | (u1, v1) |
| (x2, y2) | (u2, v2) |
| (x3, y3) | (u3, v3) |

Solve for:

- translation
- rotation
- scale

---

## Approach 3 — Hybrid

- Use bounding box for initial estimate
- Fine-tune using anchor points

---

## Choosing Anchor Points

Good candidates:

- Control points
- Spawn doors
- Corners
- Payload checkpoints

---

## Rotation Detection

Given two points:

```

θ = angle(image_vector) - angle(world_vector)

```

---

## Output

A single transform per map:

```ts
const transform: MapTransform = {
  origin: { x, y },
  scale,
  rotation,
};
```
