# Implementation (TypeScript)

## Core Function

```ts
type Vec2 = { x: number; y: number };

type MapTransform = {
  origin: Vec2;
  scale: number;
  rotation: number;
};

export function worldToImage(
  pos: Vec2,
  t: MapTransform
): { u: number; v: number } {
  // translate
  const x = pos.x - t.origin.x;
  const y = pos.y - t.origin.y;

  // rotate
  const cos = Math.cos(t.rotation);
  const sin = Math.sin(t.rotation);

  const rx = x * cos - y * sin;
  const ry = x * sin + y * cos;

  // scale + flip Y
  return {
    u: rx * t.scale,
    v: -ry * t.scale,
  };
}
```

---

## Example Usage

```ts
const transform = {
  origin: { x: -500, y: -300 },
  scale: 2.5,
  rotation: Math.PI / 4,
};

const pixel = worldToImage({ x: 100, y: 200 }, transform);
```

---

## Heatmap Binning

```ts
const grid = new Map<string, number>();

function addPoint(u: number, v: number) {
  const key = `${Math.floor(u)},${Math.floor(v)}`;
  grid.set(key, (grid.get(key) ?? 0) + 1);
}
```
