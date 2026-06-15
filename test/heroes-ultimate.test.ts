import { allHeroes, getHeroUltimate } from "@/types/heroes";
import { describe, expect, test } from "vitest";

describe("getHeroUltimate", () => {
  test("returns the canonical ult name for known heroes", () => {
    expect(getHeroUltimate("Sojourn")).toBe("Overclock");
    expect(getHeroUltimate("Kiriko")).toBe("Kitsune Rush");
    expect(getHeroUltimate("Reinhardt")).toBe("Earthshatter");
  });

  test("every hero has a mapped ultimate name (invariant)", () => {
    const unmapped = allHeroes.filter((h) => getHeroUltimate(h.name) === null);
    expect(unmapped.map((h) => h.name)).toEqual([]);
  });

  test("returns null for an unknown hero string (the helper's fallback path)", () => {
    expect(getHeroUltimate("Not A Hero")).toBeNull();
  });
});
