import { expect, test } from "vitest";
import { dayKey } from "@/lib/usage/rollup";

test("dayKey formats a Date as YYYY-MM-DD", () => {
  expect(dayKey(new Date("2026-06-10T23:30:00.000Z"))).toBe("2026-06-10");
});
