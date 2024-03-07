import { round } from "@/lib/utils";
import { HeroName, heroRoleMapping } from "@/types/heroes";
import { PlayerStatRows } from "@/types/prisma";

export type PlayerData = {
  id: number;
  playerName: string;
  role: string;
  playerTeam: string;
  timePlayed: number;
  eliminations: number;
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
  mostPlayedHero: HeroName;
};

export function determineRole(heroName: HeroName) {
  return heroRoleMapping[heroName] || "Flex";
}

export function aggregatePlayerData(rows: PlayerStatRows): PlayerData[] {
  const playerMap = new Map<string, PlayerData>();
  const playerMaxMatchTime = new Map<string, number>();
  const teamElimsMap = new Map<string, number>();
  const heroTimeMap = new Map<string, Map<HeroName, number>>();

  rows.forEach((row, index) => {
    let player = playerMap.get(row.player_name);

    // Update team total eliminations
    const currentTeamElims = teamElimsMap.get(row.player_team) || 0;
    teamElimsMap.set(row.player_team, currentTeamElims + row.eliminations);

    if (!player) {
      player = {
        id: index, // You need to define how you want to handle the ID
        playerName: row.player_name,
        role: determineRole(row.player_hero as HeroName),
        playerTeam: row.player_team,
        eliminations: 0,
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
        mostPlayedHero: row.player_hero as HeroName,
      };
    }

    const currentMaxTime = playerMaxMatchTime.get(row.player_name) || 0;
    if (row.match_time > currentMaxTime) {
      playerMaxMatchTime.set(row.player_name, row.match_time);
    }

    // Update hero time for each player
    let heroTimes = heroTimeMap.get(row.player_name);
    if (!heroTimes) {
      heroTimes = new Map<HeroName, number>();
      heroTimeMap.set(row.player_name, heroTimes);
    }
    heroTimes.set(
      row.player_hero as HeroName,
      (heroTimes.get(row.player_hero as HeroName) || 0) + row.hero_time_played
    );

    // Update the stats
    player.eliminations += row.eliminations;
    player.kills += row.final_blows;
    player.assists += row.offensive_assists;
    player.deaths += row.deaths;
    player.heroDmgDealt += row.hero_damage_dealt;
    player.dmgReceived += row.damage_taken;
    player.healingReceived += row.healing_received;
    player.healingDealt += row.healing_dealt;
    player.ultsCharged += row.ultimates_earned;
    player.ultsUsed += row.ultimates_used;
    player.timePlayed += row.hero_time_played;

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

    playerMap.set(row.player_name, player);
  });

  heroTimeMap.forEach((heroTimes, playerName) => {
    let mostPlayedHero = "None";
    let maxTime = 0;

    heroTimes.forEach((time, hero) => {
      if (time > maxTime) {
        mostPlayedHero = hero;
        maxTime = time;
      }
    });

    const playerData = playerMap.get(playerName);
    if (playerData) {
      playerData.mostPlayedHero = mostPlayedHero as HeroName;
      playerMap.set(playerName, playerData);
    }
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
