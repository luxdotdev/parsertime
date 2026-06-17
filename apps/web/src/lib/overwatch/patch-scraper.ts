import {
  classifyPatch,
  type PatchTypeEnum,
} from "@/lib/overwatch/patch-classifier";
import * as cheerio from "cheerio";
import { parse } from "date-fns";

export type ParsedPatch = {
  date: string; // YYYY-MM-DD
  type: PatchTypeEnum;
  name: string;
  rawTitle: string;
  sourceUrl: string;
  bodyExcerpt: string;
  needsReview: boolean;
};

const PATCH_NOTES_BASE =
  "https://overwatch.blizzard.com/en-us/news/patch-notes/live";

// Matches "...Patch Notes – June 26, 2025" / "... - June 26, 2025".
const TITLE_DATE_RE = /([A-Z][a-z]+ \d{1,2},\s*\d{4})\s*$/;

function toIsoDate(label: string): string | null {
  const match = label.match(TITLE_DATE_RE);
  if (!match) return null;
  const parsed = parse(
    match[1].replace(/\s+/g, " "),
    "MMMM d, yyyy",
    new Date()
  );
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parsePatchNotes(
  html: string,
  sourceUrl: string
): ParsedPatch[] {
  const $ = cheerio.load(html);
  const patches: ParsedPatch[] = [];

  $(".PatchNotes-patchTitle").each((_, el) => {
    const titleEl = $(el);
    const rawTitle = titleEl.text().trim();

    // Precise date comes from the title; fall back to the display label.
    const label = titleEl
      .closest(".PatchNotes-patch")
      .find(".PatchNotes-date")
      .first()
      .text()
      .trim();
    const date = toIsoDate(rawTitle) ?? toIsoDate(label);
    if (!date) return;

    const body = titleEl
      .nextUntil(".PatchNotes-patchTitle", ".PatchNotes-section")
      .toArray()
      .map((s) => $(s).text())
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const { type, name, needsReview } = classifyPatch({ rawTitle, body });

    patches.push({
      date,
      type,
      name,
      rawTitle,
      sourceUrl,
      bodyExcerpt: body.slice(0, 500),
      needsReview,
    });
  });

  return patches;
}

export async function fetchPatchNotesHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "parsertime-patch-scraper/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Patch notes fetch failed: ${res.status} for ${url}`);
  }
  return res.text();
}

export async function scrapeRecent(): Promise<ParsedPatch[]> {
  const html = await fetchPatchNotesHtml(PATCH_NOTES_BASE);
  return parsePatchNotes(html, PATCH_NOTES_BASE);
}

export async function scrapeMonth(
  year: number,
  month: number
): Promise<ParsedPatch[]> {
  const url = `${PATCH_NOTES_BASE}/${year}/${month}`;
  const html = await fetchPatchNotesHtml(url);
  return parsePatchNotes(html, url);
}
