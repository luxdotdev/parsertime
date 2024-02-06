import { PlayerStatRows } from "@/types/prisma";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Rounds a number to two decimal places.
 *
 * @param {number} value - The number to round.
 * @returns {number} The rounded number.
 */
export function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Converts a hero name to the format used for the hero image file names.
 * Removes any accents, spaces, and converts to lowercase.
 *
 * @param {string} name - The player name to convert.
 * @returns {string} The hero name.
 *
 * @example
 * // Returns 'lucio'
 * toHero('Lúcio');
 */
export function toHero(name: string) {
  // remove any accents and spaces, then convert to lowercase
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s/g, "")
    .replace(":", "")
    .toLowerCase();
}

/**
 * Converts a string to title case.
 *
 * @param {string} str - The string to convert to title case.
 * @returns {string} The title case string.
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
  });
}

/**
 * Converts a string to kebab case.
 *
 * @param {string} str - The string to convert to kebab case.
 * @returns {string} The kebab case string.
 */
export function toKebabCase(str: string): string {
  return (
    str
      // Normalize the string and remove accents
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Convert to lowercase
      .toLowerCase()
      // Remove special characters
      .replace(/[^\w\s]/g, "")
      // Replace spaces with hyphens
      .replace(/\s+/g, "-")
  );
}

/**
 * Returns the number of minutes from a number of seconds.
 *
 * @param {number} value - The number of seconds.
 * @returns {number} The number of minutes.
 */
export function toMins(value: number) {
  return Math.floor(value / 60);
}

/**
 * Removes duplicate rows from an array of player stat rows based on all fields except the 'id'.
 *
 * This function iterates over the provided array of row objects and identifies duplicates
 * by comparing a serialized string of all key-value pairs except the 'id'. It uses a Set
 * to keep track of unique entries and filters out any duplicates. The function is useful
 * for post-processing data fetched from a database where rows may contain duplicates
 * in all fields except their primary key ('id').
 *
 * @param {PlayerStatRows} rows - Array of player stat rows, each object representing a database row.
 * @returns {PlayerStatRows} An array of player stat rows, with duplicates removed.
 *
 * @example
 * // Assuming playerStatRows is an array of player stat rows from the database
 * const uniquePlayerStatRows = removeDuplicateRows(playerStatRows);
 */
export function removeDuplicateRows(rows: PlayerStatRows): PlayerStatRows {
  const uniqueSet = new Set();
  return rows.filter((row) => {
    // Create a unique string for each row, excluding the 'id'
    const uniqueString = JSON.stringify({
      scrimId: row.scrimId,
      eventType: row.event_type,
      matchTime: row.match_time,
      roundNumber: row.round_number,
      playerTeam: row.player_team,
      playerName: row.player_name,
      playerHero: row.player_hero,
      eliminations: row.eliminations,
      finalBlows: row.final_blows,
      deaths: row.deaths,
      allDamageDealt: row.all_damage_dealt,
      barrierDamageDealt: row.barrier_damage_dealt,
      heroDamageDealt: row.hero_damage_dealt,
      healingDealt: row.healing_dealt,
      healingReceived: row.healing_received,
      selfHealing: row.self_healing,
      damageTaken: row.damage_taken,
      damageBlocked: row.damage_blocked,
      defensiveAssists: row.defensive_assists,
      offensiveAssists: row.offensive_assists,
      ultimatesEarned: row.ultimates_earned,
      ultimatesUsed: row.ultimates_used,
      multikillBest: row.multikill_best,
      multikills: row.multikills,
      soloKills: row.solo_kills,
      objectiveKills: row.objective_kills,
      environmentalKills: row.environmental_kills,
      environmentalDeaths: row.environmental_deaths,
      criticalHits: row.critical_hits,
      criticalHitAccuracy: row.critical_hit_accuracy,
      scopedAccuracy: row.scoped_accuracy,
      scopedCriticalHitAccuracy: row.scoped_critical_hit_accuracy,
      scopedCriticalHitKills: row.scoped_critical_hit_kills,
      shotsFired: row.shots_fired,
      shotsHit: row.shots_hit,
      shotsMissed: row.shots_missed,
      scopedShots: row.scoped_shots,
      scopedShotsHit: row.scoped_shots_hit,
      weaponAccuracy: row.weapon_accuracy,
      heroTimePlayed: row.hero_time_played,
      MapDataId: row.MapDataId,
    });

    // Check if this unique string is already in the set
    if (uniqueSet.has(uniqueString)) {
      return false; // Duplicate found, filter out this row
    } else {
      uniqueSet.add(uniqueString); // Add to set and keep this row
      return true;
    }
  });
}
