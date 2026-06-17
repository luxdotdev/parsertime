# Map Coordinate Alignment System

This system defines how to map in-game world coordinates to 2D top-down map images for visualization (e.g., heatmaps, pathing, analytics).

## Goals

- Convert `(x, y, z)` world coordinates → `(u, v)` pixel coordinates
- Ensure alignment is:
  - Scaled correctly
  - Rotated correctly
  - Positioned correctly
- Support reusable transforms per map

## Core Concept

Each map has a transformation:

```

world space → normalized → rotated → scaled → image space

```

## Key Components

- Coordinate systems (world vs image)
- Map bounds
- Transform (translation, rotation, scale)
- Calibration (anchor points)
- Validation (visual overlays)

## Output

A reusable function:

```ts
function worldToImage(x: number, y: number): { u: number; v: number };
```

---

## File Overview

- `coordinate-systems.md` → defines spaces
- `transforms.md` → math and transformations
- `calibration.md` → how to compute transforms
- `implementation.md` → TypeScript examples
- `validation.md` → how to verify correctness
- `pitfalls.md` → common failure modes
