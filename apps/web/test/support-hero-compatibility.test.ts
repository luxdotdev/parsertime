import {
  allHeroes,
  getHeroRole,
  getHeroUltimate,
  heroAbilityMapping,
  roleHeroMapping,
} from "@/types/heroes";
import { describe, expect, it } from "vitest";

describe("current support hero compatibility", () => {
  it("recognizes Sombra and Doctrine throughout the support roster", () => {
    for (const hero of ["Sombra", "Doctrine"] as const) {
      expect(getHeroRole(hero)).toBe("Support");
      expect(roleHeroMapping.Support).toContain(hero);
      expect(roleHeroMapping.Damage).not.toContain(hero);
      expect(allHeroes.some((entry) => entry.name === hero)).toBe(true);
    }

    expect(heroAbilityMapping.Sombra.ability1Name).toBe("Cyberspace");
    expect(heroAbilityMapping.Doctrine.ability2Name).toBe("Shrouded Momentum");
    expect(getHeroUltimate("Doctrine")).toBe("Deliverance");
  });
});
