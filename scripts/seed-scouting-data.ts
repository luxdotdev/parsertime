#!/usr/bin/env bun

import prisma from "@/lib/prisma";
import { type MapType } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

interface HeroBanData {
  hero: string;
  order: number;
}

interface MapResultData {
  gameNumber: number;
  mapType: string;
  mapName: string;
  team1Score: string;
  team2Score: string;
  winner: string;
  team1HeroBan: HeroBanData | null;
  team2HeroBan: HeroBanData | null;
}

interface MatchData {
  team1: string;
  team1FullName: string;
  team2: string;
  team2FullName: string;
  team1Score: number;
  team2Score: number;
  bestOf: number;
  winner: string;
  winnerFullName: string;
  date: string;
  timestamp: number;
  maps: MapResultData[];
  mvp: string | null;
}

interface TournamentData {
  title: string;
  sourceUrl: string;
  mapPool: Record<string, string[]>;
  matches: MatchData[];
}

const VALID_MAP_TYPES: Set<string> = new Set([
  "Clash",
  "Control",
  "Escort",
  "Flashpoint",
  "Hybrid",
  "Push",
]);

function toMapType(raw: string): MapType | null {
  if (!VALID_MAP_TYPES.has(raw)) {
    return null;
  }
  return raw as MapType;
}

function collectHeroBans(map: MapResultData): Array<{
  team: string;
  hero: string;
  banOrder: number;
}> {
  const bans: Array<{ team: string; hero: string; banOrder: number }> = [];
  if (map.team1HeroBan) {
    bans.push({
      team: "team1",
      hero: map.team1HeroBan.hero,
      banOrder: map.team1HeroBan.order,
    });
  }
  if (map.team2HeroBan) {
    bans.push({
      team: "team2",
      hero: map.team2HeroBan.hero,
      banOrder: map.team2HeroBan.order,
    });
  }
  return bans;
}

async function seedMatch(tournamentId: number, match: MatchData) {
  const matchDate = new Date(match.timestamp * 1000);
  let mapCount = 0;
  let heroBanCount = 0;

  const createdMatch = await prisma.scoutingMatch.create({
    data: {
      tournamentId,
      team1: match.team1,
      team1FullName: match.team1FullName,
      team2: match.team2,
      team2FullName: match.team2FullName,
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      bestOf: match.bestOf,
      winner: match.winner,
      winnerFullName: match.winnerFullName,
      matchDate,
      mvp: match.mvp,
    },
  });

  for (const map of match.maps) {
    const mapType = toMapType(map.mapType);
    if (!mapType) {
      console.log(`    Skipping map ${map.gameNumber} with unknown type "${map.mapType}"`);
      continue;
    }

    const heroBans = collectHeroBans(map);

    await prisma.scoutingMapResult.create({
      data: {
        matchId: createdMatch.id,
        gameNumber: map.gameNumber,
        mapType,
        mapName: map.mapName,
        team1Score: map.team1Score,
        team2Score: map.team2Score,
        winner: map.winner,
        heroBans: {
          createMany: { data: heroBans },
        },
      },
    });
    mapCount++;
    heroBanCount += heroBans.length;
  }

  return { mapCount, heroBanCount };
}

async function seedTournament(tournament: TournamentData) {
  const existing = await prisma.scoutingTournament.findUnique({
    where: { title: tournament.title },
  });

  if (existing) {
    console.log(`  Skipping "${tournament.title}" (already exists)`);
    return { matches: 0, maps: 0, heroBans: 0, skipped: true };
  }

  const createdTournament = await prisma.scoutingTournament.create({
    data: {
      title: tournament.title,
      sourceUrl: tournament.sourceUrl,
      mapPool: tournament.mapPool,
    },
  });

  let matchCount = 0;
  let mapCount = 0;
  let heroBanCount = 0;

  try {
    for (const match of tournament.matches) {
      const result = await seedMatch(createdTournament.id, match);
      matchCount++;
      mapCount += result.mapCount;
      heroBanCount += result.heroBanCount;
    }
  } catch (error) {
    console.error(`  Rolling back tournament "${tournament.title}" due to error`);
    await prisma.scoutingTournament.delete({
      where: { id: createdTournament.id },
    });
    throw error;
  }

  return { matches: matchCount, maps: mapCount, heroBans: heroBanCount, skipped: false };
}

async function main() {
  const dataPath = resolve(
    process.env.HOME ?? "~",
    "code/scouting-scraper/data/json/all_tournaments.json"
  );

  console.log(`Reading data from ${dataPath}\n`);

  const raw = readFileSync(dataPath, "utf-8");
  const tournaments: TournamentData[] = JSON.parse(raw);

  console.log(`Found ${tournaments.length} tournaments to process\n`);

  let totalMatches = 0;
  let totalMaps = 0;
  let totalHeroBans = 0;
  let inserted = 0;
  let skipped = 0;

  for (const tournament of tournaments) {
    console.log(`Processing "${tournament.title}"...`);

    try {
      const result = await seedTournament(tournament);

      if (result.skipped) {
        skipped++;
      } else {
        inserted++;
        totalMatches += result.matches;
        totalMaps += result.maps;
        totalHeroBans += result.heroBans;
        console.log(
          `  Inserted ${result.matches} matches, ${result.maps} maps, ${result.heroBans} hero bans`
        );
      }
    } catch (error) {
      console.error(
        `  Error seeding "${tournament.title}":`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("SEED SUMMARY");
  console.log("=".repeat(50));
  console.log(`Tournaments inserted: ${inserted}`);
  console.log(`Tournaments skipped:  ${skipped}`);
  console.log(`Total matches:        ${totalMatches}`);
  console.log(`Total map results:    ${totalMaps}`);
  console.log(`Total hero bans:      ${totalHeroBans}`);
  console.log("=".repeat(50));

  const dbCounts = await Promise.all([
    prisma.scoutingTournament.count(),
    prisma.scoutingMatch.count(),
    prisma.scoutingMapResult.count(),
    prisma.scoutingHeroBan.count(),
  ]);

  console.log("\nDatabase totals:");
  console.log(`  ScoutingTournament: ${dbCounts[0]}`);
  console.log(`  ScoutingMatch:      ${dbCounts[1]}`);
  console.log(`  ScoutingMapResult:  ${dbCounts[2]}`);
  console.log(`  ScoutingHeroBan:    ${dbCounts[3]}`);
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
