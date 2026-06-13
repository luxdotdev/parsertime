#!/usr/bin/env bun
/** Read-only FACEIT player scouting sanity check. Prints a rated player's full
 * profile and an unrated player's degraded profile. Writes nothing.
 * Usage: bun scripts/faceit-player-dry-run.ts [faceitPlayerId] */
import { ManagedRuntime, Effect } from "effect";
import { FaceitPlayerScoutingService, FaceitPlayerScoutingServiceLive } from "../src/data/faceit/player-service";

async function main() {
  const rt = ManagedRuntime.make(FaceitPlayerScoutingServiceLive);
  const players = await rt.runPromise(
    FaceitPlayerScoutingService.pipe(Effect.flatMap((s) => s.getFaceitPlayers()))
  );
  console.log(`Total players: ${players.length}`);
  const ratedId = process.argv[2] ?? players.find((p) => p.topFsr != null)?.faceitPlayerId;
  const unratedId = players.find((p) => p.topFsr == null)?.faceitPlayerId;

  for (const [label, id] of [["RATED", ratedId], ["UNRATED", unratedId]] as const) {
    if (!id) continue;
    const p = await rt.runPromise(
      FaceitPlayerScoutingService.pipe(Effect.flatMap((s) => s.getFaceitPlayerProfile(id)))
    );
    console.log(`\n=== ${label}: ${p?.player.nickname} (${id}) rated=${p?.rated} ===`);
    if (!p) { console.log("null profile"); continue; }
    console.log("FSR roles:", JSON.stringify(p.fsrRoles.map((r) => ({ role: r.role, fsr: r.fsr, primary: r.primary, headlineTier: r.headlineTier, tiers: r.tiers.map((t) => ({ tier: t.tier, fsr: t.fsr, pct: Math.round(t.percentile) })), strengths: r.strengths.map((s) => s.stat), weaknesses: r.weaknesses.map((s) => s.stat) }))));
    console.log("Role usage:", JSON.stringify(p.roleUsage));
    console.log("Top maps:", JSON.stringify(p.mapWinrates.byMap.slice(0, 5)));
    console.log("Match history (first 3):", JSON.stringify(p.matchHistory.slice(0, 3)));
    console.log("History length:", p.matchHistory.length, "Teams:", JSON.stringify(p.teams.slice(0, 5)));
  }
  await rt.dispose();
}
main().catch((e) => console.error("ERR", e instanceof Error ? e.message : e)).finally(() => process.exit(0));
