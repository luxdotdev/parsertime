import { toHero, toTitleCase } from "@/lib/utils";
import { expect, test } from "vitest";

test("should return a hero name that is lowercase and without accents", () => {
  const name = "Lúcio"; // edge case with an accent
  const hero = toHero(name);
  expect(hero).toBe("lucio");

  const name2 = "D.Va"; // edge case with a period
  const hero2 = toHero(name2);
  expect(hero2).toBe("dva");

  const name3 = "Soldier: 76"; // edge case with a colon and a space
  const hero3 = toHero(name3);
  expect(hero3).toBe("soldier76");
});

test("should return a title case string", () => {
  const str = "lijiang tower (lunar new year)"; // edge case with parentheses
  const title = toTitleCase(str);
  expect(title).toBe("Lijiang Tower (Lunar New Year)");

  const str2 = "Circuit royal"; // occurs in the logs
  const title2 = toTitleCase(str2);
  expect(title2).toBe("Circuit Royal");
});
