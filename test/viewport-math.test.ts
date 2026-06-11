import { describe, expect, it } from "vitest";
import {
  applyZoomFactor,
  clampZoom,
  getInitialFitZoom,
  getMinZoom,
  MAX_ZOOM,
  panBy,
} from "@/components/map/viewport-math";

describe("getMinZoom / getInitialFitZoom", () => {
  it("min zoom fits the image height to the container", () => {
    expect(getMinZoom(600, 1200)).toBe(0.5);
  });

  it("initial fit contains the whole image (min of width/height fit)", () => {
    // wide image: width-fit is the smaller factor
    expect(getInitialFitZoom(800, 600, 1600, 600)).toBe(0.5);
  });
});

describe("clampZoom", () => {
  it("clamps to [minZoom, MAX_ZOOM]", () => {
    expect(clampZoom(0.1, 0.5)).toBe(0.5);
    expect(clampZoom(999, 0.5)).toBe(MAX_ZOOM);
    expect(clampZoom(2, 0.5)).toBe(2);
  });
});

describe("applyZoomFactor", () => {
  it("recenters when zooming out to the floor", () => {
    const v = { offsetX: 50, offsetY: -30, zoom: 0.55 };
    const next = applyZoomFactor(v, 0.9, 0.5);
    expect(next).toEqual({ offsetX: 0, offsetY: 0, zoom: 0.5 });
  });

  it("keeps the offset when zooming in above the floor", () => {
    const v = { offsetX: 50, offsetY: -30, zoom: 1 };
    const next = applyZoomFactor(v, 1.1, 0.5);
    expect(next.zoom).toBeCloseTo(1.1);
    expect(next.offsetX).toBe(50);
    expect(next.offsetY).toBe(-30);
  });
});

describe("panBy", () => {
  it("adds the delta to the offset", () => {
    expect(panBy({ offsetX: 1, offsetY: 2, zoom: 1 }, 10, -5)).toEqual({
      offsetX: 11,
      offsetY: -3,
      zoom: 1,
    });
  });
});
