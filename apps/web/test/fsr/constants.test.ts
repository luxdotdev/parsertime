import { FaceitTier } from "@/generated/prisma/client";
import {
  FSR_MIN_MAPS_PER_CELL,
  FSR_SHRINKAGE_K,
  tierWeight,
} from "@/lib/fsr/constants";
import { describe, expect, it } from "vitest";

describe("FSR constants", () => {
  it("ramps tier weight from Open to OWCS", () => {
    expect(tierWeight(FaceitTier.OPEN)).toBe(1.0);
    expect(tierWeight(FaceitTier.ADVANCED)).toBe(1.25);
    expect(tierWeight(FaceitTier.EXPERT)).toBe(1.5);
    expect(tierWeight(FaceitTier.MASTERS)).toBe(1.75);
    expect(tierWeight(FaceitTier.OWCS)).toBe(2.0);
  });

  it("exposes tunable shrinkage and min-maps defaults", () => {
    expect(FSR_SHRINKAGE_K).toBe(8);
    expect(FSR_MIN_MAPS_PER_CELL).toBe(8);
  });
});
