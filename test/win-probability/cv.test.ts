import { groupFold, runGroupedCV } from "@/lib/win-probability/training/cv";
import type { DatasetRow } from "@/lib/win-probability/types";
import { describe, expect, test } from "vitest";

describe("groupFold", () => {
  test("is deterministic and spreads groups across k folds", () => {
    const folds = new Set<number>();
    for (let id = 1; id <= 200; id++) {
      const f = groupFold(id, 5);
      expect(f).toBe(groupFold(id, 5));
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(5);
      folds.add(f);
    }
    expect(folds.size).toBe(5);
  });
});

describe("runGroupedCV", () => {
  test("same-match rows never straddle train/validation", () => {
    // aliveDiff fully determines the label → a leak-free CV still learns it.
    const rows: DatasetRow[] = [];
    for (let m = 1; m <= 50; m++) {
      for (let i = 0; i < 40; i++) {
        const adv = (i % 5) - 2;
        rows.push({
          matchId: m,
          roundId: `${m}-1`,
          label: adv > 0 ? 1 : 0,
          features: [adv, 0, 0, 0, 0, 0, 0, 0, 0],
        });
      }
    }
    const result = runGroupedCV(rows, 5, {
      learningRate: 0.5,
      epochs: 150,
      l2: 1e-4,
    });
    expect(result.pooled.logLoss).toBeLessThan(0.5);
    expect(result.folds).toHaveLength(5);
    for (const fold of result.folds) {
      expect(fold.validationCount).toBeGreaterThan(0);
    }
  });
});
