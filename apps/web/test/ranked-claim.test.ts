import { deriveOauthKeys } from "@/lib/ranked/claim";
import { expect, test } from "vitest";

test("deriveOauthKeys produces provider:id strings", () => {
  const keys = deriveOauthKeys([
    { providerId: "github", accountId: "1" },
    { providerId: "google", accountId: "2" },
  ]);
  expect(keys).toEqual(["github:1", "google:2"]);
});

test("deriveOauthKeys returns empty for no accounts", () => {
  expect(deriveOauthKeys([])).toEqual([]);
});
