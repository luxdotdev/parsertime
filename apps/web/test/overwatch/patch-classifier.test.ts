import { classifyPatch } from "@/lib/overwatch/patch-classifier";
import { expect, test } from "vitest";

test("classifies a hotfix from the body keyword", () => {
  const result = classifyPatch({
    rawTitle: "Overwatch Retail Patch Notes – May 12, 2026",
    body: "Bug Fix Hotfix Patch This is a bug fixing hotfix patch. All replay codes are still available.",
  });
  expect(result.type).toBe("HOTFIX");
  expect(result.name).toBe("Overwatch Retail Patch Notes – May 12, 2026");
  expect(result.needsReview).toBe(true);
});

test("classifies a season and extracts the codename", () => {
  const result = classifyPatch({
    rawTitle: "Overwatch Retail Patch Notes - April 14, 2026",
    body: "Season 2: Summit Patch Notes The story resumes in Reign of Talon - Season 2: Summit.",
  });
  expect(result.type).toBe("SEASON");
  expect(result.name).toBe("Season 2: Summit");
  expect(result.needsReview).toBe(false);
});

test("defaults to mid-season and flags for review", () => {
  const result = classifyPatch({
    rawTitle: "Overwatch Retail Patch Notes – March 10, 2026",
    body: "Balance changes for tanks and supports. Replay codes have been wiped.",
  });
  expect(result.type).toBe("MID_SEASON");
  expect(result.name).toBe("Overwatch Retail Patch Notes – March 10, 2026");
  expect(result.needsReview).toBe(true);
});

test("hotfix keyword takes priority over a stray season mention", () => {
  const result = classifyPatch({
    rawTitle: "Overwatch Retail Patch Notes – February 25, 2026",
    body: "Hotfix Patch Quick fixes following Season 1: Conquest. Replay codes preserved.",
  });
  expect(result.type).toBe("HOTFIX");
});

test("does not classify a non-hotfix 'Bug Fix Patch' as hotfix", () => {
  const result = classifyPatch({
    rawTitle: "Overwatch Retail Patch Notes – May 30, 2024",
    body: "Bug Fix Patch Balance adjustments. Replay codes have been wiped.",
  });
  expect(result.type).not.toBe("HOTFIX");
  expect(result.type).toBe("MID_SEASON");
});

// Real Blizzard hotfix phrasings observed in the wild — the word "hotfix"
// appears without the literal "Hotfix Patch" adjacency.
test("classifies a hotfix from 'This hotfix includes' phrasing", () => {
  const result = classifyPatch({
    rawTitle: "Overwatch Retail Patch Notes - February 13, 2026",
    body: "Hero Balance UpdatesThis hotfix includes small adjustments to the six newest heroes.",
  });
  expect(result.type).toBe("HOTFIX");
});

test("classifies a 'Balance Hotfix Update' as hotfix", () => {
  const result = classifyPatch({
    rawTitle: "Overwatch Retail Patch Notes – April 17, 2026",
    body: "Balance Hotfix UpdateThis is a balance hotfix update. Replay codes from the April 14, 2026 patch are still available.",
  });
  expect(result.type).toBe("HOTFIX");
});

test("a 'Hotfix Update' wins even when the body also says 'bug fix patch'", () => {
  const result = classifyPatch({
    rawTitle: "Overwatch Retail Patch Notes - March 12, 2026",
    body: "Hotfix UpdateThis is a bug fix patch. Replay codes from March 10, 2026 patch are still available.",
  });
  expect(result.type).toBe("HOTFIX");
});

test("a real 'Bug Fix Update' with codes wiped stays mid-season", () => {
  const result = classifyPatch({
    rawTitle: "Overwatch Retail Patch Notes – April 28, 2026",
    body: "Bug Fix UpdateThis is a bug fix update. Replay codes have been wiped.",
  });
  expect(result.type).toBe("MID_SEASON");
});

test("extracts a season codename containing a hyphen", () => {
  const result = classifyPatch({
    rawTitle: "Overwatch Retail Patch Notes - June 20, 2024",
    body: "Season 11: Super-Mega Ultrawatch Patch Notes Big changes this season.",
  });
  expect(result.type).toBe("SEASON");
  expect(result.name).toBe("Season 11: Super-Mega Ultrawatch");
  expect(result.needsReview).toBe(false);
});
