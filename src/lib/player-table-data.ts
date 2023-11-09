import { HeroName, heroRoleMapping } from "@/types/heroes";
import { PlayerStatTableRow } from "@/types/parser";

export type PlayerData = {
  id: number;
  playerName: string;
  role: string;
  playerTeam: string;
  timePlayed: number;
  kills: number;
  assists: number;
  deaths: number;
  kd: number;
  kad: number;
  heroDmgDealt: number;
  dmgReceived: number;
  healingReceived: number;
  healingDealt: number;
  dmgToHealsRatio: number;
  ultsCharged: number;
  ultsUsed: number;
};

export function round(value: number) {
  // round to 2 decimal places
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function determineRole(heroName: HeroName) {
  return heroRoleMapping[heroName] || "Flex";
}

export function aggregatePlayerData(rows: PlayerStatTableRow[]): PlayerData[] {
  const playerMap = new Map<string, PlayerData>();
  const playerMaxMatchTime = new Map<string, number>();
  const teamElimsMap = new Map<string, number>();

  rows.forEach((row, index) => {
    const [
      _eventType,
      matchTime,
      _roundNumber,
      playerTeam,
      playerName,
      playerHero,
      eliminations,
      finalBlows,
      deaths,
      _allDamageDealt,
      _barrierDamageDealt,
      heroDamageDealt,
      healingDealt,
      healingReceived,
      _selfHealing,
      damageTaken,
      _damageBlocked,
      _defensiveAssists,
      offensiveAssists,
      ultimatesEarned,
      ultimatesUsed,
      hero_time_played,
    ] = row;

    let player = playerMap.get(playerName);

    // Update team total eliminations
    const currentTeamElims = teamElimsMap.get(playerTeam) || 0;
    teamElimsMap.set(playerTeam, currentTeamElims + eliminations);

    if (!player) {
      player = {
        id: index, // You need to define how you want to handle the ID
        playerName,
        role: determineRole(playerHero),
        playerTeam,
        kills: 0,
        assists: 0,
        deaths: 0,
        kd: 0,
        kad: 0,
        heroDmgDealt: 0,
        dmgReceived: 0,
        healingReceived: 0,
        healingDealt: 0,
        dmgToHealsRatio: 0,
        ultsCharged: 0,
        ultsUsed: 0,
        timePlayed: 0,
      };
    }

    const currentMaxTime = playerMaxMatchTime.get(playerName) || 0;
    if (matchTime > currentMaxTime) {
      playerMaxMatchTime.set(playerName, matchTime);
    }

    // Update the stats
    player.kills += finalBlows;
    player.assists += offensiveAssists;
    player.deaths += deaths;
    player.heroDmgDealt += heroDamageDealt;
    player.dmgReceived += damageTaken;
    player.healingReceived += healingReceived;
    player.healingDealt += healingDealt;
    player.ultsCharged += ultimatesEarned;
    player.ultsUsed += ultimatesUsed;
    player.timePlayed += hero_time_played;

    // Recalculate ratios - you will need to define these calculations
    player.kd = player.deaths !== 0 ? player.kills / player.deaths : 0;
    player.kad =
      player.deaths !== 0 ? (player.kills + player.assists) / player.deaths : 0;
    player.dmgToHealsRatio = player.heroDmgDealt / player.healingReceived;

    // round all fields to 2 decimal places
    player.kd = round(player.kd);
    player.kad = round(player.kad);
    player.heroDmgDealt = round(player.heroDmgDealt);
    player.dmgReceived = round(player.dmgReceived);
    player.healingReceived = round(player.healingReceived);
    player.healingDealt = round(player.healingDealt);
    player.dmgToHealsRatio = round(player.dmgToHealsRatio);

    playerMap.set(playerName, player);
  });

  // Set time played for each player
  playerMaxMatchTime.forEach((maxTime, playerName) => {
    const player = playerMap.get(playerName) || {
      // ... Initialize other fields for the player
      timePlayed: 0,
      // ... Other fields
    };

    // Set time played in minutes
    player.timePlayed = round(maxTime / 60);
    playerMap.set(playerName, player as PlayerData);
  });

  return Array.from(playerMap.values());
}
