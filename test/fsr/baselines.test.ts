import { computeBaselines, baselineKey } from "@/lib/fsr/baselines";
import { FaceitRole, FaceitTier } from "@/generated/prisma/client";
import type { FsrGroupRow } from "@/lib/fsr/types";
import { describe, expect, it } from "vitest";

function group(id: string, per10Elims: number): FsrGroupRow {
  // With sumRecencyTime=600, statPer10(x, 600) = x, so weightedSums.eliminations = per10Elims.
  return {
    faceitPlayerId: id,
    role: FaceitRole.DAMAGE,
    tier: FaceitTier.OPEN,
    mapCount: 10,
    recentMapCount: 10,
    sumRecency: 10,
    sumRecencyTime: 600,
    weightedSums: {
      eliminations: per10Elims,
      finalBlows: 0,
      deaths: 0,
      damageDealt: 0,
      healingDone: 0,
      damageMitigated: 0,
      soloKills: 0,
      assists: 0,
      objectiveTime: 0,
    },
  };
}

describe("FSR baselines", () => {
  it("computes per-stat mean and sample stddev within a (tier, role)", () => {
    const groups = [group("a", 10), group("b", 20), group("c", 30)];
    const baselines = computeBaselines(groups, 8);
    const cell = baselines.get(baselineKey(FaceitTier.OPEN, FaceitRole.DAMAGE));
    expect(cell?.sampleN).toBe(3);
    expect(cell?.baseline.eliminations?.mean).toBeCloseTo(20, 6);
    expect(cell?.baseline.eliminations?.stddev).toBeCloseTo(10, 6);
  });

  it("excludes groups below the min-maps threshold from the baseline", () => {
    const small = group("d", 999);
    small.mapCount = 3;
    const baselines = computeBaselines([group("a", 10), group("b", 20), small], 8);
    const cell = baselines.get(baselineKey(FaceitTier.OPEN, FaceitRole.DAMAGE));
    expect(cell?.sampleN).toBe(2);
    expect(cell?.baseline.eliminations?.mean).toBeCloseTo(15, 6);
  });
});
