import { determineRole } from "@/lib/player-table-data";
import type { HeroName } from "@/types/heroes";
import type {
  HeroPickrate,
  HeroPickrateMatrix,
  HeroPickrateRawData,
  PlayerHeroData,
} from "@/data/team-analytics-dto";

export function calculateHeroPickrateMatrix(
  rawData: HeroPickrateRawData,
  dateFrom?: Date,
  dateTo?: Date
): HeroPickrateMatrix {
  const { teamRoster, allPlayerStats } = rawData;
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0 || rawData.mapDataRecords.length === 0) {
    return {
      players: [],
      allHeroes: [],
    };
  }

  // Filter map records by date if provided
  let mapDataRecords = rawData.mapDataRecords;
  if (dateFrom && dateTo) {
    mapDataRecords = mapDataRecords.filter((record) => {
      return record.scrimDate >= dateFrom && record.scrimDate <= dateTo;
    });
  }

  if (mapDataRecords.length === 0) {
    return {
      players: [],
      allHeroes: [],
    };
  }

  const mapDataIds = new Set(mapDataRecords.map((md) => md.id));

  // Build player hero data
  const playerHeroMap = new Map<
    string,
    Map<HeroName, { playtime: number; games: Set<number> }>
  >();
  const allHeroesSet = new Set<HeroName>();

  // Determine team name for each map
  const mapTeamNames = new Map<number, string>();
  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;
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

    if (teamName) {
      mapTeamNames.set(mapDataId, teamName);
    }
  }

  // Build hero data
  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const teamName = mapTeamNames.get(mapDataId);
    if (!teamName) continue;

    const playersOnMap = allPlayerStats.filter(
      (stat) =>
        stat.MapDataId === mapDataId &&
        stat.player_team === teamName &&
        mapDataIds.has(stat.MapDataId ?? -1)
    );

    if (!playersOnMap.every((p) => teamRosterSet.has(p.player_name))) continue;

    for (const stat of playersOnMap) {
      const playerName = stat.player_name;
      const heroName = stat.player_hero as HeroName;

      if (!playerHeroMap.has(playerName)) {
        playerHeroMap.set(playerName, new Map());
      }

      const playerHeroes = playerHeroMap.get(playerName)!;
      if (!playerHeroes.has(heroName)) {
        playerHeroes.set(heroName, { playtime: 0, games: new Set() });
      }

      const heroData = playerHeroes.get(heroName)!;
      heroData.playtime += stat.hero_time_played;
      heroData.games.add(mapDataId);

      allHeroesSet.add(heroName);
    }
  }

  const players: PlayerHeroData[] = [];

  for (const [playerName, heroesMap] of playerHeroMap.entries()) {
    let totalPlaytime = 0;
    const heroes: HeroPickrate[] = [];

    for (const [heroName, data] of heroesMap.entries()) {
      const role = determineRole(heroName);
      if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

      totalPlaytime += data.playtime;
      heroes.push({
        heroName,
        role,
        playtime: data.playtime,
        gamesPlayed: data.games.size,
      });
    }

    // Sort by playtime descending
    heroes.sort((a, b) => b.playtime - a.playtime);

    players.push({
      playerName,
      heroes,
      totalPlaytime,
    });
  }

  // Sort players by total playtime
  players.sort((a, b) => b.totalPlaytime - a.totalPlaytime);

  return {
    players,
    allHeroes: Array.from(allHeroesSet),
  };
}
