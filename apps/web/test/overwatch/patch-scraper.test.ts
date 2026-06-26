import { parsePatchNotes } from "@/lib/overwatch/patch-scraper";
import { expect, test } from "vitest";

const FIXTURE = `
<div class="PatchNotes-patch" id="patch-2026-04-14">
  <div class="PatchNotes-labels"><div class="PatchNotes-date">April 14, 2026</div></div>
  <h3 class="PatchNotes-patchTitle">Overwatch Retail Patch Notes - April 14, 2026</h3>
  <div class="PatchNotes-section">Season 2: Summit Patch Notes The story resumes in Reign of Talon - Season 2: Summit.</div>
</div>
<div class="PatchNotes-patch" id="patch-2026-04-23">
  <div class="PatchNotes-labels"><div class="PatchNotes-date">April 23, 2026</div></div>
  <h3 class="PatchNotes-patchTitle">Overwatch Retail Patch Notes – April 23, 2026</h3>
  <div class="PatchNotes-section">Bug Fix Hotfix Patch This is a bug fixing hotfix patch. All replay codes are still available.</div>
</div>
`;

test("parses each patch entry with date from the title", () => {
  const patches = parsePatchNotes(FIXTURE, "https://example.test/live");
  expect(patches).toHaveLength(2);

  expect(patches[0]).toMatchObject({
    date: "2026-04-14",
    rawTitle: "Overwatch Retail Patch Notes - April 14, 2026",
    type: "SEASON",
    name: "Season 2: Summit",
    sourceUrl: "https://example.test/live",
  });

  expect(patches[1]).toMatchObject({
    date: "2026-04-23",
    type: "HOTFIX",
  });
});

test("prefers the title date over an imprecise display label", () => {
  const html = `
<div class="PatchNotes-patch">
  <div class="PatchNotes-date">June 27, 2025</div>
  <h3 class="PatchNotes-patchTitle">Overwatch 2 Retail Patch Notes - June 26, 2025</h3>
  <div class="PatchNotes-section">Balance changes.</div>
</div>`;
  const patches = parsePatchNotes(html, "https://example.test/live/2025/6");
  expect(patches[0].date).toBe("2025-06-26");
});

test("skips entries with no parseable date", () => {
  const html = `
<div class="PatchNotes-patch">
  <h3 class="PatchNotes-patchTitle">Overwatch Retail Patch Notes</h3>
  <div class="PatchNotes-section">No date here.</div>
</div>`;
  expect(parsePatchNotes(html, "https://example.test/live")).toHaveLength(0);
});
