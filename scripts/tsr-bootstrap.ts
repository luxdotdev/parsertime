#!/usr/bin/env bun
/**
 * One-shot TSR bootstrap. Use this once after the schema migration to seed
 * the database with a real player pool — the daily cron only re-ingests
 * players we already track, so it can't populate an empty DB.
 *
 * Steps:
 *   1. Sweep the tracked organizers and upsert all championships (with
 *      auto-classification).
 *   2. For each seed player, fetch their history → upsert all
 *      championship-type matches → cascade to all roster co-players.
 *   3. Backfill every tracked, classified championship in the DB by
 *      pulling its full match list (past + ongoing). Fills in seasons
 *      that no seed player has covered.
 *   4. Enrich every FaceitPlayer row with their full profile (readable
 *      BattleTag, region, verified flag, skill level).
 *   5. Run a full TSR recompute.
 *
 * Step 3 is the slow one (potentially thousands of API calls). Pass
 * --skip-backfill to run only steps 1, 2, 4, 5 — useful for re-runs
 * after small data changes.
 *
 * Usage:
 *   FACEIT_API_KEY=<key> bun scripts/tsr-bootstrap.ts [seed-nicknames…]
 *
 * Defaults to "pge" and "baYek9" if no seed nicknames are passed.
 */

import {
  backfillTrackedChampionships,
  discoverAllTrackedChampionships,
  enrichKnownPlayers,
  ingestPlayerHistory,
  upsertFullPlayer,
} from "@/lib/tsr/ingest";
import { recomputeAllTsrs } from "@/lib/tsr/replay";
import {
  type FaceitPlayerLookupResult,
  getPlayerById,
  lookupPlayerByNickname,
  searchPlayers,
} from "@/lib/tsr/faceit-client";

const DEFAULT_SEEDS = ["pge", "baYek9"];

async function resolveSeed(
  nick: string
): Promise<FaceitPlayerLookupResult | null> {
  const direct = await lookupPlayerByNickname(nick);
  if (direct) return direct;
  const candidates = await searchPlayers(nick);
  if (candidates.length === 0) return null;
  const ranked = candidates.slice().sort((a, b) => {
    if (!!b.verified !== !!a.verified) return b.verified ? 1 : -1;
    const sa = Number(a.games?.find((g) => g.name === "ow2")?.skill_level ?? 0);
    const sb = Number(b.games?.find((g) => g.name === "ow2")?.skill_level ?? 0);
    return sb - sa;
  });
  const picked = ranked[0]!;
  return getPlayerById(picked.player_id);
}

async function main() {
  if (!process.env.FACEIT_API_KEY) {
    console.error("FACEIT_API_KEY env var is required");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const skipBackfill = args.includes("--skip-backfill");
  const seeds = args.filter((a) => !a.startsWith("--"));
  const seedNicks = seeds.length > 0 ? seeds : DEFAULT_SEEDS;
  const totalSteps = skipBackfill ? 4 : 5;

  console.log(`\n[1/${totalSteps}] Discovering championships under tracked organizers…`);
  const discovery = await discoverAllTrackedChampionships();
  console.log(`  ${JSON.stringify(discovery, null, 2)}`);

  console.log(`\n[2/${totalSteps}] Ingesting seed players: ${seedNicks.join(", ")}`);
  for (const nick of seedNicks) {
    console.log(`\n  → ${nick}`);
    const player = await resolveSeed(nick);
    if (!player) {
      console.warn(`    ! no FACEIT player found for "${nick}"`);
      continue;
    }
    console.log(`    found ${player.nickname} (${player.player_id})`);
    await upsertFullPlayer(player);
    const result = await ingestPlayerHistory(player.player_id, {
      maxPages: 20,
    });
    console.log(
      `    scanned=${result.scanned} ingested=${result.ingested} skipped=${result.skipped} affected=${result.affectedPlayerIds.size}`
    );
  }

  if (!skipBackfill) {
    console.log(
      `\n[3/${totalSteps}] Backfilling every tracked championship (past + ongoing)…`
    );
    const backfill = await backfillTrackedChampionships();
    console.log(
      `  championships=${backfill.championships} ingested=${backfill.totalIngested} skipped=${backfill.totalSkipped}`
    );
  }

  const enrichStep = skipBackfill ? 3 : 4;
  console.log(
    `\n[${enrichStep}/${totalSteps}] Enriching player profiles (readable BattleTags, regions)…`
  );
  const enrich = await enrichKnownPlayers();
  console.log(
    `  scanned=${enrich.scanned} enriched=${enrich.enriched} failed=${enrich.failed}`
  );

  console.log(`\n[${totalSteps}/${totalSteps}] Running full TSR recompute…`);
  const replay = await recomputeAllTsrs();
  console.log(`  ${JSON.stringify(replay)}`);

  console.log(`\nDone.\n`);
}

main().catch((err) => {
  console.error("\n!! bootstrap failed:", err);
  process.exit(1);
});
