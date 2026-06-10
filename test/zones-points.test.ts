import { pointInPolygon } from "@/lib/zones/geometry";
import { extractPointPolygon } from "@/lib/zones/points";
import { expect, test } from "vitest";

function blob(n: number, cx: number, cz: number, r: number) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const angle = i * 2.399963;
    const dist = r * Math.sqrt(i / n);
    out.push({ x: cx + dist * Math.cos(angle), z: cz + dist * Math.sin(angle) });
  }
  return out;
}

test("extractPointPolygon returns a polygon containing the density peak", () => {
  const samples = blob(500, 50, 50, 10);
  const polygon = extractPointPolygon(samples);
  expect(polygon).not.toBeNull();
  expect(pointInPolygon(50, 50, polygon!)).toBe(true);
});

test("polygon excludes far-away outliers", () => {
  const samples = [...blob(500, 50, 50, 10), { x: 500, z: 500 }];
  const polygon = extractPointPolygon(samples)!;
  expect(pointInPolygon(500, 500, polygon)).toBe(false);
});

test("returns null below the sample quality bar", () => {
  const samples = blob(50, 50, 50, 10);
  expect(extractPointPolygon(samples)).toBeNull();
});

test("returns null for absurdly dispersed data (area bar)", () => {
  const samples = [];
  for (let i = 0; i < 300; i++) {
    samples.push({ x: (i * 37) % 600, z: (i * 53) % 600 });
  }
  expect(extractPointPolygon(samples)).toBeNull();
});
