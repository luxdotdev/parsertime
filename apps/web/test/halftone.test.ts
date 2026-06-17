import { describe, expect, it } from "vitest";
import { luminance, renderHalftoneSvg, sampleDots } from "@/lib/halftone";
import { fallingHalftoneSvg } from "@/app/falling-halftone";

describe("luminance", () => {
  it("returns 0 for black and ~1 for white", () => {
    expect(luminance(0, 0, 0)).toBe(0);
    expect(luminance(255, 255, 255)).toBeCloseTo(1, 5);
  });
});

describe("sampleDots", () => {
  const opts = { cols: 2, cell: 10, maxRadius: 1, threshold: 0.5 };

  it("emits a dot for a dark cell and skips light cells", () => {
    // 2x2 RGBA, row-major: top-left black, rest white
    const px = new Uint8Array([
      0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    ]);
    const dots = sampleDots(px, 2, 2, 4, opts);
    expect(dots).toHaveLength(1);
    expect(dots[0].cx).toBe(5);
    expect(dots[0].cy).toBe(5);
    expect(dots[0].r).toBeGreaterThan(0);
  });

  it("skips fully transparent pixels even if dark", () => {
    const px = new Uint8Array([0, 0, 0, 0]); // black but alpha 0
    const dots = sampleDots(px, 1, 1, 4, opts);
    expect(dots).toHaveLength(0);
  });

  it("scales dot radius with darkness", () => {
    const black = new Uint8Array([0, 0, 0, 255]);
    const gray = new Uint8Array([80, 80, 80, 255]);
    const [d1] = sampleDots(black, 1, 1, 4, opts);
    const [d2] = sampleDots(gray, 1, 1, 4, opts);
    expect(d1.r).toBeGreaterThan(d2.r);
  });

  it("treats RGB (3-channel) buffers as fully opaque", () => {
    // 1x1 RGB black pixel — no alpha channel; must still emit a dot.
    const px = new Uint8Array([0, 0, 0]);
    const dots = sampleDots(px, 1, 1, 3, opts);
    expect(dots).toHaveLength(1);
    expect(dots[0].r).toBeGreaterThan(0);
  });
});

describe("renderHalftoneSvg", () => {
  it("produces an svg that uses currentColor and circles", () => {
    const svg = renderHalftoneSvg([{ cx: 5, cy: 5, r: 4 }]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain("<circle");
  });

  it("returns a valid empty svg when there are no dots", () => {
    const svg = renderHalftoneSvg([]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).not.toContain("<circle");
  });
});

describe("generated falling-halftone", () => {
  it("exports a non-trivial inline svg using currentColor", () => {
    expect(fallingHalftoneSvg.startsWith("<svg")).toBe(true);
    expect(fallingHalftoneSvg).toContain('fill="currentColor"');
    expect(fallingHalftoneSvg).toContain("<circle");
    expect(fallingHalftoneSvg.length).toBeGreaterThan(500);
  });
});
