import {
  STRENGTH_Z_THRESHOLD,
  statZToRadar,
  strengthsWeaknesses,
  roleUsage,
} from "@/data/faceit/player-aggregations";
import { FaceitRole } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";

const statZ = {
  eliminations: 1.2,
  deaths: 0.9,
  assists: -0.1,
  soloKills: 2.0,
  finalBlows: 0.3,
  damageDealt: -1.5,
  healingDone: 0.0,
  damageMitigated: 0.05,
  objectiveTime: -0.8,
};

describe("player aggregations", () => {
  it("maps statZ to an ordered, complete radar (9 axes)", () => {
    const radar = statZToRadar(statZ);
    expect(radar).toHaveLength(9);
    expect(radar.find((a) => a.stat === "soloKills")?.z).toBeCloseTo(2.0, 6);
    expect(radar.map((a) => a.stat)).toEqual([
      "eliminations", "finalBlows", "deaths", "damageDealt", "healingDone",
      "damageMitigated", "soloKills", "assists", "objectiveTime",
    ]);
  });

  it("derives strengths and weaknesses above the |z| threshold", () => {
    const { strengths, weaknesses } = strengthsWeaknesses(statZ);
    expect(strengths.map((s) => s.stat)).toEqual(["soloKills", "eliminations", "deaths"]);
    expect(weaknesses.map((s) => s.stat)).toEqual(["damageDealt", "objectiveTime"]);
    expect(strengths.every((s) => s.kind === "strength")).toBe(true);
    expect(STRENGTH_Z_THRESHOLD).toBe(0.75);
  });

  it("computes role usage shares and marks the primary role", () => {
    const usage = roleUsage([
      { role: FaceitRole.DAMAGE, mapCount: 80 },
      { role: FaceitRole.TANK, mapCount: 20 },
    ]);
    const dmg = usage.find((u) => u.role === FaceitRole.DAMAGE)!;
    expect(dmg.share).toBeCloseTo(0.8, 6);
    expect(usage[0].role).toBe(FaceitRole.DAMAGE);
  });
});
