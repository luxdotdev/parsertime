import { determineRole } from "@/lib/player-table-data";
import { calculateWinner } from "@/lib/winrate";
import type {
  HeroDiversity,
  HeroPlaytime,
  HeroPoolAnalysis,
  HeroPoolRawData,
  HeroSpecialist,
  HeroWinrate,
} from "@/data/team-hero-pool-dto";
import type { HeroName } from "@/types/heroes";

function findTeamNameForMapInMemory(
  mapDataId: number,
  allPlayerStats: HeroPoolRawData["allPlayerStats"],
  teamRosterSet: Set<string>
): string | null {
  const teamCounts = new Map<string, number>();

  for (const stat of allPlayerStats) {
    if (stat.MapDataId === mapDataId && teamRosterSet.has(stat.player_name)) {
      const currentCount = teamCounts.get(stat.player_team) ?? 0;
      teamCounts.set(stat.player_team, currentCount + 1);
    }
  }

  let maxCount = 0;
  let teamName: string | null = null;

  for (const [team, count] of teamCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      teamName = team;
    }
  }

  return teamName;
}

function createEmptyHeroPoolAnalysis(): HeroPoolAnalysis {
  return {
    mostPlayedByRole: {
      Tank: [],
      Damage: [],
      Support: [],
    },
    topHeroWinrates: [],
    specialists: [],
    diversity: {
      totalUniqueHeroes: 0,
      heroesPerRole: {
        Tank: 0,
        Damage: 0,
        Support: 0,
      },
      diversityScore: 0,
      effectiveHeroPool: 0,
    },
  };
}

export function calculateHeroPoolAnalysis(
  rawData: HeroPoolRawData,
  dateFrom?: Date,
  dateTo?: Date
): HeroPoolAnalysis {
  const { teamRoster, allPlayerStats, matchStarts, finalRounds, captures } =
    rawData;
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0 || rawData.mapDataRecords.length === 0) {
    return createEmptyHeroPoolAnalysis();
  }

  // Filter map records by date if provided
  let mapDataRecords = rawData.mapDataRecords;
  if (dateFrom && dateTo) {
    mapDataRecords = mapDataRecords.filter((record) => {
      return record.scrimDate >= dateFrom && record.scrimDate <= dateTo;
    });
  }

  if (mapDataRecords.length === 0) {
    return createEmptyHeroPoolAnalysis();
  }

  const mapDataIds = new Set(mapDataRecords.map((md) => md.id));

  // Build lookup maps
  const finalRoundMap = new Map<number, (typeof finalRounds)[0]>();
  for (const round of finalRounds) {
    const mapDataId = round.MapDataId;
    if (mapDataId && mapDataIds.has(mapDataId)) {
      const existing = finalRoundMap.get(mapDataId);
      if (!existing || round.round_number > existing.round_number) {
        finalRoundMap.set(mapDataId, round);
      }
    }
  }

  const matchStartMap = new Map<number, (typeof matchStarts)[0]>();
  for (const match of matchStarts) {
    if (match.MapDataId && mapDataIds.has(match.MapDataId)) {
      matchStartMap.set(match.MapDataId, match);
    }
  }

  const team1CapturesMap = new Map<number, typeof captures>();
  const team2CapturesMap = new Map<number, typeof captures>();

  for (const capture of captures) {
    const mapDataId = capture.MapDataId;
    if (!mapDataId || !mapDataIds.has(mapDataId)) continue;

    const match = matchStartMap.get(mapDataId);
    if (!match) continue;

    if (capture.capturing_team === match.team_1_name) {
      if (!team1CapturesMap.has(mapDataId)) {
        team1CapturesMap.set(mapDataId, []);
      }
      team1CapturesMap.get(mapDataId)!.push(capture);
    } else if (capture.capturing_team === match.team_2_name) {
      if (!team2CapturesMap.has(mapDataId)) {
        team2CapturesMap.set(mapDataId, []);
      }
      team2CapturesMap.get(mapDataId)!.push(capture);
    }
  }

  type HeroData = {
    playtime: number;
    gamesPlayed: Set<number>;
    playedBy: Set<string>;
    wins: number;
    losses: number;
  };

  type PlayerHeroData = {
    playtime: number;
    gamesPlayed: Set<number>;
  };

  const heroDataMap = new Map<HeroName, HeroData>();
  const playerHeroMap = new Map<string, Map<HeroName, PlayerHeroData>>();

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;

    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === teamName
    );

    if (!playersOnMap.every((p) => teamRosterSet.has(p.player_name))) continue;

    const matchDetails = matchStartMap.get(mapDataId) ?? null;
    const finalRound = finalRoundMap.get(mapDataId) ?? null;
    const winner = calculateWinner({
      matchDetails,
      finalRound,
      team1Captures: team1CapturesMap.get(mapDataId) ?? [],
      team2Captures: team2CapturesMap.get(mapDataId) ?? [],
    });

    const isWin = winner === teamName;

    for (const stat of playersOnMap) {
      const heroName = stat.player_hero as HeroName;
      const playerName = stat.player_name;

      if (!heroDataMap.has(heroName)) {
        heroDataMap.set(heroName, {
          playtime: 0,
          gamesPlayed: new Set(),
          playedBy: new Set(),
          wins: 0,
          losses: 0,
        });
      }

      const heroData = heroDataMap.get(heroName)!;
      heroData.playtime += stat.hero_time_played;
      heroData.gamesPlayed.add(mapDataId);
      heroData.playedBy.add(playerName);

      if (isWin) {
        heroData.wins++;
      } else {
        heroData.losses++;
      }

      if (!playerHeroMap.has(playerName)) {
        playerHeroMap.set(playerName, new Map());
      }

      const playerHeroes = playerHeroMap.get(playerName)!;
      if (!playerHeroes.has(heroName)) {
        playerHeroes.set(heroName, {
          playtime: 0,
          gamesPlayed: new Set(),
        });
      }

      const playerHeroData = playerHeroes.get(heroName)!;
      playerHeroData.playtime += stat.hero_time_played;
      playerHeroData.gamesPlayed.add(mapDataId);
    }
  }

  const mostPlayedByRole: HeroPoolAnalysis["mostPlayedByRole"] = {
    Tank: [],
    Damage: [],
    Support: [],
  };

  const allHeroWinrates: HeroWinrate[] = [];

  for (const [heroName, data] of heroDataMap.entries()) {
    const role = determineRole(heroName);
    if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

    const heroPlaytime: HeroPlaytime = {
      heroName,
      role,
      totalPlaytime: data.playtime,
      gamesPlayed: data.gamesPlayed.size,
      playedBy: Array.from(data.playedBy),
    };

    mostPlayedByRole[role].push(heroPlaytime);

    const gamesPlayed = data.wins + data.losses;
    if (gamesPlayed > 0) {
      allHeroWinrates.push({
        heroName,
        role,
        wins: data.wins,
        losses: data.losses,
        winrate: (data.wins / gamesPlayed) * 100,
        gamesPlayed,
        totalPlaytime: data.playtime,
      });
    }
  }

  mostPlayedByRole.Tank.sort((a, b) => b.totalPlaytime - a.totalPlaytime);
  mostPlayedByRole.Damage.sort((a, b) => b.totalPlaytime - a.totalPlaytime);
  mostPlayedByRole.Support.sort((a, b) => b.totalPlaytime - a.totalPlaytime);

  const topHeroWinrates = allHeroWinrates
    .filter((h) => h.gamesPlayed >= 3)
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, 10);

  const specialists: HeroSpecialist[] = [];

  for (const [playerName, heroesMap] of playerHeroMap.entries()) {
    for (const [heroName, data] of heroesMap.entries()) {
      const role = determineRole(heroName);
      if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

      const totalHeroPlaytime = heroDataMap.get(heroName)?.playtime ?? 0;
      const ownershipPercentage =
        totalHeroPlaytime > 0 ? (data.playtime / totalHeroPlaytime) * 100 : 0;

      if (ownershipPercentage >= 30) {
        specialists.push({
          playerName,
          heroName,
          role,
          playtime: data.playtime,
          gamesPlayed: data.gamesPlayed.size,
          ownershipPercentage,
        });
      }
    }
  }

  specialists.sort((a, b) => b.ownershipPercentage - a.ownershipPercentage);

  const uniqueHeroes = heroDataMap.size;
  const heroesPerRole = {
    Tank: mostPlayedByRole.Tank.length,
    Damage: mostPlayedByRole.Damage.length,
    Support: mostPlayedByRole.Support.length,
  };

  const effectiveHeroPool = Array.from(heroDataMap.values()).filter(
    (data) => data.gamesPlayed.size >= 3
  ).length;

  const maxHeroes = 41;
  const diversityScore = Math.min((uniqueHeroes / maxHeroes) * 100, 100);

  const diversity: HeroDiversity = {
    totalUniqueHeroes: uniqueHeroes,
    heroesPerRole,
    diversityScore,
    effectiveHeroPool,
  };

  return {
    mostPlayedByRole,
    topHeroWinrates,
    specialists,
    diversity,
  };
}
