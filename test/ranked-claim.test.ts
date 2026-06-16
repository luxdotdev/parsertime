import { deriveOauthKeys } from "@/lib/ranked/claim";
import { expect, test } from "vitest";

test("deriveOauthKeys produces provider:id strings", () => {
  const keys = deriveOauthKeys([
    { provider: "github", providerAccountId: "1" },
    { provider: "google", providerAccountId: "2" },
  ]);
  expect(keys).toEqual(["github:1", "google:2"]);
});

test("deriveOauthKeys returns empty for no accounts", () => {
  expect(deriveOauthKeys([])).toEqual([]);
});
