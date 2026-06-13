#!/usr/bin/env bun
/**
 * Read-only FACEIT team scouting sanity check. Picks the team with the most
 * matches (or a faceitTeamId passed as argv[2]), runs the profile, and prints
 * it. Writes nothing.
 *
 * Usage: bun scripts/faceit-team-dry-run.ts [faceitTeamId]
 */
import { FaceitTeamScoutingService, FaceitTeamScoutingServiceLive } from "../src/data/faceit/team-service";
import { Effect, ManagedRuntime } from "effect";

// Build a script-local runtime from just the FACEIT layer.
// AppRuntime (src/data/runtime) has `import "server-only"` which throws in bun,
// so we construct a minimal runtime here instead.
const ScriptRuntime = ManagedRuntime.make(FaceitTeamScoutingServiceLive);

async function main() {
  const teams = await ScriptRuntime.runPromise(
    FaceitTeamScoutingService.pipe(Effect.flatMap((s) => s.getFaceitTeams()))
  );
  console.log(`Total teams: ${teams.length}`);
  const teamId = process.argv[2] ?? teams[0]?.faceitTeamId;
  if (!teamId) throw new Error("no teams found");

  const profile = await ScriptRuntime.runPromise(
    FaceitTeamScoutingService.pipe(Effect.flatMap((s) => s.getFaceitTeamProfile(teamId)))
  );
  if (!profile) {
    console.log(`No profile for ${teamId}`);
    return;
  }
  console.log(`\n=== ${profile.team.name} (${teamId}) ===`);
  console.log("Overview:", JSON.stringify(profile.overview));
  console.log("Strength:", JSON.stringify(profile.strength));
  console.log("Top maps:", JSON.stringify(profile.mapAnalysis.byMap.slice(0, 6)));
  console.log("Attack/Defense:", JSON.stringify(profile.mapAnalysis.attackDefense));
  console.log("Hero-ban env (top 6 by |delta|):", JSON.stringify(profile.heroBanEnvironment.slice(0, 6)));
  console.log("Roster:", JSON.stringify(profile.roster.map((p) => ({ n: p.nickname, role: p.role, fsr: p.fsr, tsr: p.tsr, share: Number(p.appearanceShare.toFixed(2)) }))));
  console.log("Related teams:", JSON.stringify(profile.relatedTeams));
  console.log("Recommendations:", JSON.stringify(profile.recommendations, null, 2));
}

main().catch((e) => console.error("ERR", e instanceof Error ? e.message : e)).finally(() => process.exit(0));
