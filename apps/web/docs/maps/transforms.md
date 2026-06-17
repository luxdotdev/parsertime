# Transform Model

We use a 2D affine transform composed of:

1. Translation
2. Rotation
3. Scale
4. Y-axis flip

---

## Transform Pipeline

```

world → translate → rotate → scale → flip → image

```

---

## Equations

### Translation

```

x' = x - origin.x
y' = y - origin.y

```

---

### Rotation

```

rx = x' * cos(θ) - y' * sin(θ)
ry = x' * sin(θ) + y' * cos(θ)

```

---

### Scaling

```

sx = rx * scale
sy = ry * scale

```

---

### Y Flip (Image Space)

```

u = sx
v = -sy

```

---

## Final Mapping

```

u = (rotated_x) * scale
v = -(rotated_y) * scale

```

---

## Transform Definition

```ts
type MapTransform = {
  origin: { x: number; y: number };
  scale: number;
  rotation: number; // radians
};
```
