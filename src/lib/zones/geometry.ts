export type Vertex = [number, number];

/** Ray-casting containment test. Vertices may be convex or concave. */
export function pointInPolygon(
  x: number,
  z: number,
  vertices: Vertex[]
): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [xi, zi] = vertices[i];
    const [xj, zj] = vertices[j];
    const intersects =
      zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Shoelace formula; returns absolute area. */
export function polygonArea(vertices: Vertex[]): number {
  let sum = 0;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [xi, zi] = vertices[i];
    const [xj, zj] = vertices[j];
    sum += xj * zi - xi * zj;
  }
  return Math.abs(sum) / 2;
}

function cross(o: Vertex, a: Vertex, b: Vertex): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/** Andrew's monotone chain. Returns counter-clockwise hull, [] for <3 points. */
export function convexHull(points: Vertex[]): Vertex[] {
  if (points.length < 3) return [];
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const lower: Vertex[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Vertex[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  const hull = [...lower, ...upper];
  return hull.length >= 3 ? hull : [];
}
