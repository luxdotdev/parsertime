import { describe, expect, it } from "vitest";
import { adjacentBuckets, sameBucket } from "@/lib/matchmaker/adjacency";
import { FaceitTier } from "@prisma/client";

describe("adjacency", () => {
  it("Mid Masters has Low Masters and High Masters as adjacent", () => {
    const adj = adjacentBuckets({
      bracketTier: FaceitTier.MASTERS,
      bracketBand: "Mid",
    });
    expect(adj).toEqual([
      { bracketTier: FaceitTier.MASTERS, bracketBand: "Low" },
      { bracketTier: FaceitTier.MASTERS, bracketBand: "High" },
    ]);
  });

  it("High Masters has Mid Masters below and OWCS above", () => {
    const adj = adjacentBuckets({
      bracketTier: FaceitTier.MASTERS,
      bracketBand: "High",
    });
    expect(adj).toEqual([
      { bracketTier: FaceitTier.MASTERS, bracketBand: "Mid" },
      { bracketTier: FaceitTier.OWCS, bracketBand: null },
    ]);
  });

  it("OWCS has only High Masters as adjacent (open-ended top)", () => {
    const adj = adjacentBuckets({
      bracketTier: FaceitTier.OWCS,
      bracketBand: null,
    });
    expect(adj).toEqual([
      { bracketTier: FaceitTier.MASTERS, bracketBand: "High" },
    ]);
  });

  it("Low Open has Mid Open above and nothing below", () => {
    const adj = adjacentBuckets({
      bracketTier: FaceitTier.OPEN,
      bracketBand: "Low",
    });
    expect(adj).toEqual([{ bracketTier: FaceitTier.OPEN, bracketBand: "Mid" }]);
  });

  it("High Open is adjacent to Mid Open and Low Advanced", () => {
    const adj = adjacentBuckets({
      bracketTier: FaceitTier.OPEN,
      bracketBand: "High",
    });
    expect(adj).toEqual([
      { bracketTier: FaceitTier.OPEN, bracketBand: "Mid" },
      { bracketTier: FaceitTier.ADVANCED, bracketBand: "Low" },
    ]);
  });

  it("sameBucket compares tier and band", () => {
    expect(
      sameBucket(
        { bracketTier: FaceitTier.MASTERS, bracketBand: "Mid" },
        { bracketTier: FaceitTier.MASTERS, bracketBand: "Mid" }
      )
    ).toBe(true);
    expect(
      sameBucket(
        { bracketTier: FaceitTier.MASTERS, bracketBand: "Mid" },
        { bracketTier: FaceitTier.MASTERS, bracketBand: "High" }
      )
    ).toBe(false);
    expect(
      sameBucket(
        { bracketTier: FaceitTier.OWCS, bracketBand: null },
        { bracketTier: FaceitTier.OWCS, bracketBand: null }
      )
    ).toBe(true);
  });
});
