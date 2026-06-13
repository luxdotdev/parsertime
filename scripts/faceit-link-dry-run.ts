#!/usr/bin/env bun
/**
 * Read-only sanity check for the OWCS->FACEIT roster link service. Runs the
 * link for a few known-overlapping teams. Writes nothing.
 *
 * Usage: bun scripts/faceit-link-dry-run.ts ["Team Full Name"]
 */
import {
  ScoutingFaceitLinkService,
  ScoutingFaceitLinkServiceLive,
} from "../src/data/scouting/faceit-link-service";
import { Effect, ManagedRuntime } from "effect";

const ScriptRuntime = ManagedRuntime.make(ScoutingFaceitLinkServiceLive);

const TEAMS = process.argv[2]
  ? [process.argv[2]]
  : ["Dallas Fuel", "Twisted Minds", "Amplify", "Team Liquid", "Nonexistent FC"];

async function main() {
  for (const team of TEAMS) {
    const link = await ScriptRuntime.runPromise(
      ScoutingFaceitLinkService.pipe(
        Effect.flatMap((s) => s.getFaceitTeamLink(team))
      )
    );
    if (!link) {
      console.log(`\n${team}: no corroborated FACEIT link`);
      continue;
    }
    console.log(
      `\n${team} -> FACEIT "${link.faceitTeamName}" (${link.faceitTeamId})`
    );
    console.log(
      `  roster ${link.rosterSize}, aggregate FSR ${link.aggregateFsr ?? "—"} (${link.fsrCovered} rated)`
    );
    for (const p of link.sharedPlayers) {
      console.log(`    ${p.owcsName} = ${p.faceitNickname}  FSR ${p.fsr ?? "—"}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
