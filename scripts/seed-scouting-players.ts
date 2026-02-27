#!/usr/bin/env bun

import prisma from "@/lib/prisma";
import { readFileSync } from "fs";
import { resolve } from "path";

interface PlayerData {
  name: string;
  team: string;
  status: string;
  role: string;
  country: string;
  signatureHeroes: string[];
  winnings: string;
  region: string;
  playerUrl: string;
}

function parseWinnings(raw: string): number {
  return parseInt(raw.replace(/[$,]/g, ""), 10) || 0;
}

async function main() {
  const dataPath = resolve(
    process.env.HOME ?? "~",
    "code/scouting-scraper/data/json/all_players.json"
  );

  console.log(`Reading data from ${dataPath}\n`);

  const raw = readFileSync(dataPath, "utf-8");
  const players = JSON.parse(raw) as PlayerData[];

  console.log(`Found ${players.length} players to process\n`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const player of players) {
    try {
      const existing = await prisma.scoutingPlayer.findUnique({
        where: { playerUrl: player.playerUrl },
      });

      await prisma.scoutingPlayer.upsert({
        where: { playerUrl: player.playerUrl },
        create: {
          name: player.name,
          team: player.team,
          status: player.status,
          role: player.role,
          country: player.country,
          signatureHeroes: player.signatureHeroes,
          winnings: parseWinnings(player.winnings),
          region: player.region,
          playerUrl: player.playerUrl,
        },
        update: {
          name: player.name,
          team: player.team,
          status: player.status,
          role: player.role,
          country: player.country,
          signatureHeroes: player.signatureHeroes,
          winnings: parseWinnings(player.winnings),
          region: player.region,
        },
      });

      if (existing) {
        updated++;
      } else {
        inserted++;
      }
    } catch (error) {
      errors++;
      console.error(
        `  Error processing "${player.name}" (${player.playerUrl}):`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("SEED SUMMARY");
  console.log("=".repeat(50));
  console.log(`Players inserted: ${inserted}`);
  console.log(`Players updated:  ${updated}`);
  console.log(`Errors:           ${errors}`);
  console.log("=".repeat(50));

  const dbCount = await prisma.scoutingPlayer.count();
  console.log(`\nDatabase total: ${dbCount} scouting players`);
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
