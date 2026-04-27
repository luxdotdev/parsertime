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
 *   3. Enrich every FaceitPlayer row with their full profile (readable
 *      BattleTag, region, verified flag, skill level).
 *   4. Run a full TSR recompute.
 *
 * Usage:
 *   FACEIT_API_KEY=<key> bun scripts/tsr-bootstrap.ts [seed-nicknames…]
 *
 * Defaults to "pge" and "baYek9" if no seed nicknames are passed.
 */

import {
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

  const seeds = process.argv.slice(2).length
    ? process.argv.slice(2)
    : DEFAULT_SEEDS;

  console.log(`\n[1/3] Discovering championships under tracked organizers…`);
  const discovery = await discoverAllTrackedChampionships();
  console.log(`  ${JSON.stringify(discovery, null, 2)}`);

  console.log(`\n[2/3] Ingesting seed players: ${seeds.join(", ")}`);
  for (const nick of seeds) {
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

  console.log(
    `\n[3/4] Enriching player profiles (readable BattleTags, regions)…`
  );
  const enrich = await enrichKnownPlayers();
  console.log(
    `  scanned=${enrich.scanned} enriched=${enrich.enriched} failed=${enrich.failed}`
  );

  console.log(`\n[4/4] Running full TSR recompute…`);
  const replay = await recomputeAllTsrs();
  console.log(`  ${JSON.stringify(replay)}`);

  console.log(`\nDone.\n`);
}

main().catch((err) => {
  console.error("\n!! bootstrap failed:", err);
  process.exit(1);
});
