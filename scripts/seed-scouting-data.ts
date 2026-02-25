#!/usr/bin/env bun

import prisma from "@/lib/prisma";
import {
  type MapType,
  type RosterCategory,
  type RosterRole,
} from "@prisma/client";
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

interface VodData {
  url: string;
  platform: string;
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
  vods: VodData[];
  matchRoomUrl: string | null;
}

interface PersonData {
  name: string;
  displayName: string;
  role: string;
  country: string;
  didNotPlay: boolean;
}

interface ParticipantData {
  team: string;
  players: PersonData[];
  staff: PersonData[];
  substitutes: PersonData[];
}

interface TournamentData {
  title: string;
  sourceUrl: string;
  mapPool: Record<string, string[]>;
  matches: MatchData[];
  participants: ParticipantData[];
}

const VALID_MAP_TYPES: Set<string> = new Set([
  "Clash",
  "Control",
  "Escort",
  "Flashpoint",
  "Hybrid",
  "Push",
]);

const LIQUIPEDIA_SUFFIX = " (page does not exist)";

function cleanTeamName(name: string): string {
  return name.endsWith(LIQUIPEDIA_SUFFIX)
    ? name.slice(0, -LIQUIPEDIA_SUFFIX.length)
    : name;
}

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

const ROLE_MAP: Record<string, RosterRole> = {
  DPS: "DPS",
  Tank: "Tank",
  Support: "Support",
  Flex: "Flex",
  Coach: "Coach",
  "Head Coach": "HeadCoach",
  "Assistant Coach": "AssistantCoach",
  Manager: "Manager",
  "Assistant Manager": "AssistantManager",
  "Team Manager": "TeamManager",
  Analyst: "Analyst",
  "Performance Coach": "PerformanceCoach",
  Substitute: "Substitute",
};

function toRosterRole(raw: string): RosterRole | null {
  return ROLE_MAP[raw] ?? null;
}

function toRosterPlayerRows(people: PersonData[], category: RosterCategory) {
  return people.flatMap((person) => {
    const role = toRosterRole(person.role);
    if (!role) {
      console.log(
        `    Skipping person "${person.name}" with unknown role "${person.role}"`
      );
      return [];
    }
    return [
      {
        name: person.name,
        displayName: person.displayName,
        role,
        country: person.country,
        didNotPlay: person.didNotPlay,
        category,
      },
    ];
  });
}

async function seedRosters(
  tournamentId: number,
  participants: ParticipantData[]
) {
  let rosterCount = 0;
  let playerCount = 0;

  for (const participant of participants) {
    const allPlayers = [
      ...toRosterPlayerRows(participant.players, "player"),
      ...toRosterPlayerRows(participant.staff, "staff"),
      ...toRosterPlayerRows(participant.substitutes, "substitute"),
    ];

    await prisma.scoutingRoster.create({
      data: {
        tournamentId,
        teamName: participant.team,
        players: { createMany: { data: allPlayers } },
      },
    });

    rosterCount++;
    playerCount += allPlayers.length;
  }

  return { rosterCount, playerCount };
}

async function seedMatch(tournamentId: number, match: MatchData) {
  const matchDate = new Date(match.timestamp * 1000);
  let mapCount = 0;
  let heroBanCount = 0;

  const createdMatch = await prisma.scoutingMatch.create({
    data: {
      tournamentId,
      team1: match.team1,
      team1FullName: cleanTeamName(match.team1FullName),
      team2: match.team2,
      team2FullName: cleanTeamName(match.team2FullName),
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      bestOf: match.bestOf,
      winner: match.winner,
      winnerFullName: cleanTeamName(match.winnerFullName),
      matchDate,
      mvp: match.mvp,
      vods: match.vods ?? [],
      matchRoomUrl: match.matchRoomUrl ?? null,
    },
  });

  for (const map of match.maps) {
    const mapType = toMapType(map.mapType);
    if (!mapType) {
      console.log(
        `    Skipping map ${map.gameNumber} with unknown type "${map.mapType}"`
      );
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
    const existingRosterCount = await prisma.scoutingRoster.count({
      where: { tournamentId: existing.id },
    });

    if (
      existingRosterCount === 0 &&
      (tournament.participants?.length ?? 0) > 0
    ) {
      console.log(`  Backfilling rosters for "${tournament.title}"...`);
      const rosterResult = await seedRosters(
        existing.id,
        tournament.participants
      );
      console.log(
        `  Backfilled ${rosterResult.rosterCount} rosters, ${rosterResult.playerCount} players`
      );
      return {
        matches: 0,
        maps: 0,
        heroBans: 0,
        rosters: rosterResult.rosterCount,
        players: rosterResult.playerCount,
        skipped: false,
      };
    }

    console.log(`  Skipping "${tournament.title}" (already exists)`);
    return {
      matches: 0,
      maps: 0,
      heroBans: 0,
      rosters: 0,
      players: 0,
      skipped: true,
    };
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
  let rosterCount = 0;
  let playerCount = 0;

  try {
    const rosterResult = await seedRosters(
      createdTournament.id,
      tournament.participants ?? []
    );
    rosterCount = rosterResult.rosterCount;
    playerCount = rosterResult.playerCount;

    for (const match of tournament.matches) {
      const result = await seedMatch(createdTournament.id, match);
      matchCount++;
      mapCount += result.mapCount;
      heroBanCount += result.heroBanCount;
    }
  } catch (error) {
    console.error(
      `  Rolling back tournament "${tournament.title}" due to error`
    );
    await prisma.scoutingTournament.delete({
      where: { id: createdTournament.id },
    });
    throw error;
  }

  return {
    matches: matchCount,
    maps: mapCount,
    heroBans: heroBanCount,
    rosters: rosterCount,
    players: playerCount,
    skipped: false,
  };
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
  let totalRosters = 0;
  let totalPlayers = 0;
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
        totalRosters += result.rosters;
        totalPlayers += result.players;
        console.log(
          `  Inserted ${result.rosters} rosters, ${result.players} players, ${result.matches} matches, ${result.maps} maps, ${result.heroBans} hero bans`
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
  console.log(`Total rosters:        ${totalRosters}`);
  console.log(`Total players:        ${totalPlayers}`);
  console.log(`Total matches:        ${totalMatches}`);
  console.log(`Total map results:    ${totalMaps}`);
  console.log(`Total hero bans:      ${totalHeroBans}`);
  console.log("=".repeat(50));

  const dbCounts = await Promise.all([
    prisma.scoutingTournament.count(),
    prisma.scoutingMatch.count(),
    prisma.scoutingMapResult.count(),
    prisma.scoutingHeroBan.count(),
    prisma.scoutingRoster.count(),
    prisma.scoutingRosterPlayer.count(),
  ]);

  console.log("\nDatabase totals:");
  console.log(`  ScoutingTournament:    ${dbCounts[0]}`);
  console.log(`  ScoutingMatch:         ${dbCounts[1]}`);
  console.log(`  ScoutingMapResult:     ${dbCounts[2]}`);
  console.log(`  ScoutingHeroBan:       ${dbCounts[3]}`);
  console.log(`  ScoutingRoster:        ${dbCounts[4]}`);
  console.log(`  ScoutingRosterPlayer:  ${dbCounts[5]}`);
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
