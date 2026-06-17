#!/usr/bin/env bun
import { upsertScrapedPatches } from "@/data/overwatch/patches-service";
import { scrapeMonth } from "@/lib/overwatch/patch-scraper";

const START_YEAR = 2026;
const START_MONTH = 1; // January 2026 onward

async function main() {
  const now = new Date();
  const endYear = now.getUTCFullYear();
  const endMonth = now.getUTCMonth() + 1;

  const totals = { inserted: 0, updated: 0, skipped: 0 };

  for (let year = START_YEAR; year <= endYear; year++) {
    const from = year === START_YEAR ? START_MONTH : 1;
    const to = year === endYear ? endMonth : 12;
    for (let month = from; month <= to; month++) {
      try {
        const patches = await scrapeMonth(year, month);
        const result = await upsertScrapedPatches(patches);
        totals.inserted += result.inserted;
        totals.updated += result.updated;
        totals.skipped += result.skipped;
        console.log(
          `${year}-${String(month).padStart(2, "0")}: ` +
            `${patches.length} scraped, +${result.inserted} new, ` +
            `~${result.updated} updated, ${result.skipped} skipped`
        );
      } catch (err) {
        console.error(`${year}-${month} failed:`, err);
      }
    }
  }

  console.log("Done:", totals);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
