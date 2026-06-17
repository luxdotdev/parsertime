import {
  bucketTeamSamples,
  MIN_MAPS_FOR_BASELINE,
  summarize,
  type TeamTempoSample,
} from "@/lib/tempo/aggregate";
import { expect, test } from "vitest";

test("summarize returns mean, population stdDev, and count", () => {
  const s = summarize([2, 4, 4, 4, 5, 5, 7, 9]);
  expect(s.sampleN).toBe(8);
  expect(s.mean).toBeCloseTo(5, 5);
  expect(s.stdDev).toBeCloseTo(2, 5); // population stddev of this classic set
});

test("summarize handles an empty list", () => {
  expect(summarize([])).toEqual({ mean: 0, stdDev: 0, sampleN: 0 });
});

test("bucketTeamSamples excludes teams below the map floor", () => {
  const samples: TeamTempoSample[] = [
    {
      mapCount: MIN_MAPS_FOR_BASELINE - 1,
      fightDuration: 99,
      chargeTime: 99,
      holdTime: 99,
    },
    {
      mapCount: MIN_MAPS_FOR_BASELINE,
      fightDuration: 25,
      chargeTime: 100,
      holdTime: 30,
    },
    { mapCount: 50, fightDuration: 27, chargeTime: 110, holdTime: 35 },
  ];
  const out = bucketTeamSamples(samples);
  expect(out.FIGHT_DURATION).toEqual([25, 27]);
  expect(out.ULT_CHARGE_TIME).toEqual([100, 110]);
  expect(out.ULT_HOLD_TIME).toEqual([30, 35]);
});

test("bucketTeamSamples drops null/non-positive metric values per-metric", () => {
  const samples: TeamTempoSample[] = [
    { mapCount: 10, fightDuration: null, chargeTime: 0, holdTime: 20 },
    { mapCount: 10, fightDuration: 25, chargeTime: 100, holdTime: 0 },
  ];
  const out = bucketTeamSamples(samples);
  expect(out.FIGHT_DURATION).toEqual([25]);
  expect(out.ULT_CHARGE_TIME).toEqual([100]);
  expect(out.ULT_HOLD_TIME).toEqual([20]);
});
