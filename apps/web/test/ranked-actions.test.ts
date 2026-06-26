import { validateMatchInput } from "@/app/ranked/validation";
import { expect, test } from "vitest";

const base = {
  map: "Ilios",
  result: "win" as const,
  groupSize: 1,
  playedAt: "2026-01-01T00:00:00Z",
  heroes: [{ hero: "Ana", percentage: 100 }],
};

test("accepts a valid match", () => {
  expect(validateMatchInput(base, 0)).toBeNull();
});
test("rejects an unknown map", () => {
  expect(validateMatchInput({ ...base, map: "Nowhere" }, 0)).toMatch(
    /Invalid map/
  );
});
test("rejects heroes not summing to 100", () => {
  const bad = { ...base, heroes: [{ hero: "Ana", percentage: 60 }] };
  expect(validateMatchInput(bad, 0)).toMatch(/sum to 100/);
});
test("rejects an unknown hero", () => {
  const bad = { ...base, heroes: [{ hero: "Mario", percentage: 100 }] };
  expect(validateMatchInput(bad, 0)).toMatch(/Invalid hero/);
});
