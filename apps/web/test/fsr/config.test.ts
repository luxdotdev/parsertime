import { getFsrStatConfigs } from "@/lib/fsr/config";
import { FaceitRole } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";

describe("FSR stat configs", () => {
  it("provides weights that sum to 1 for each role", () => {
    for (const role of [
      FaceitRole.TANK,
      FaceitRole.DAMAGE,
      FaceitRole.SUPPORT,
    ]) {
      const total = getFsrStatConfigs(role).reduce((s, c) => s + c.weight, 0);
      expect(total).toBeCloseTo(1.0, 6);
    }
  });

  it("inverts deaths for every role", () => {
    for (const role of [
      FaceitRole.TANK,
      FaceitRole.DAMAGE,
      FaceitRole.SUPPORT,
    ]) {
      const deaths = getFsrStatConfigs(role).find((c) => c.column === "deaths");
      expect(deaths?.invert).toBe(true);
    }
  });

  it("weights healing most heavily for supports", () => {
    const configs = getFsrStatConfigs(FaceitRole.SUPPORT);
    const top = [...configs].sort((a, b) => b.weight - a.weight)[0];
    expect(top.column).toBe("healingDone");
  });

  it("applies custom weight overrides", () => {
    const configs = getFsrStatConfigs(FaceitRole.DAMAGE, { eliminations: 0.5 });
    const elims = configs.find((c) => c.column === "eliminations");
    expect(elims?.weight).toBe(0.5);
  });
});
