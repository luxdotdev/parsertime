import { pickParsertimeMatch } from "../scripts/migrate-winrate-tracker";
import { expect, test } from "vitest";

test("prefers email match", () => {
  const id = pickParsertimeMatch(
    { email: "a@b.com", oauthKeys: ["github:1"] },
    new Map([["a@b.com", "pt-user-email"]]),
    new Map([["github:1", "pt-user-oauth"]])
  );
  expect(id).toBe("pt-user-email");
});

test("falls back to oauth key when email misses", () => {
  const id = pickParsertimeMatch(
    { email: "missing@b.com", oauthKeys: ["github:1"] },
    new Map(),
    new Map([["github:1", "pt-user-oauth"]])
  );
  expect(id).toBe("pt-user-oauth");
});

test("returns null when nothing matches", () => {
  const id = pickParsertimeMatch(
    { email: "x@b.com", oauthKeys: ["github:9"] },
    new Map(),
    new Map()
  );
  expect(id).toBeNull();
});
