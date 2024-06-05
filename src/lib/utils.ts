import { PlayerStatRows } from "@/types/prisma";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import prisma from "@/lib/prisma";
import { $Enums, Kill } from "@prisma/client";

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

export function format(x: number) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    .replace(".", "")
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
  return round(value / 60);
}

/**
 * Returns a string in the format "m s" from a number of seconds.
 *
 * @param {number} value - The number of seconds.
 * @returns {string} The number of minutes and seconds in the format "m s".
 */
export function toTimestamp(value: number) {
  const mins = Math.floor(value / 60)
    .toFixed(0)
    .padStart(2, "0");
  const secs = (value % 60).toFixed(0).padStart(2, "0");
  return `${mins}m ${secs}s`;
}

export function toTimestampWithHours(value: number) {
  const hours = Math.floor(value / 3600)
    .toFixed(0)
    .padStart(2, "0");
  const mins = Math.floor((value % 3600) / 60)
    .toFixed(0)
    .padStart(2, "0");
  const secs = (value % 60).toFixed(0).padStart(2, "0");
  return `${hours}h ${mins}m ${secs}s`;
}

export function toTimestampWithDays(value: number) {
  const days = Math.floor(value / 86400)
    .toFixed(0)
    .padStart(2, "0");
  const hours = Math.floor((value % 86400) / 3600)
    .toFixed(0)
    .padStart(2, "0");
  const mins = Math.floor((value % 3600) / 60)
    .toFixed(0)
    .padStart(2, "0");
  const secs = (value % 60).toFixed(0).padStart(2, "0");
  return `${days}d ${hours}h ${mins}m ${secs}s`;
}

export function removeDuplicateRows<T extends { id: number }>(rows: T[]): T[] {
  const uniqueSet = new Set<string>();
  return rows.filter((row) => {
    // Destructure the row to separate `id` from the rest of the properties
    const { id, ...rest } = row;

    const uniqueString = JSON.stringify(rest);

    if (uniqueSet.has(uniqueString)) {
      return false;
    }
    uniqueSet.add(uniqueString);
    return true;
  });
}

export function range(max: number) {
  return Array.from({ length: max }, (_, i) => i);
}

export async function groupKillsIntoFights(mapId: number) {
  type Fight = {
    kills: Kill[];
    start: number;
    end: number;
  };

  const killsByMapId = await prisma.kill.findMany({
    where: {
      MapDataId: mapId,
    },
  });

  const rezzesByMapId = await prisma.mercyRez.findMany({
    where: {
      MapDataId: mapId,
    },
  });

  if (killsByMapId.length === 0 && rezzesByMapId.length === 0) return [];

  const events = [
    ...killsByMapId,
    ...rezzesByMapId.map((rez) => ({
      id: rez.id,
      scrimId: rez.scrimId,
      event_type: "mercy_rez" as $Enums.EventType,
      match_time: rez.match_time,
      attacker_team: rez.resurrecter_team,
      attacker_name: rez.resurrecter_player,
      attacker_hero: rez.resurrecter_hero,
      victim_team: rez.resurrectee_team,
      victim_name: rez.resurrectee_player,
      victim_hero: rez.resurrectee_hero,
      event_ability: "Resurrect",
      event_damage: 0,
      is_critical_hit: "0",
      is_environmental: "0",
      MapDataId: rez.MapDataId,
    })),
  ];

  // Sorting events by match_time to properly sequence kills and rezzes
  events.sort((a, b) => a.match_time - b.match_time);

  const fights: Fight[] = [];
  let currentFight: Fight | null = null;

  events.forEach((event) => {
    if (!currentFight || event.match_time - currentFight.end > 15) {
      // Start a new fight if no current fight or we're past the 15 second window
      currentFight = {
        kills: [event],
        start: event.match_time,
        end: event.match_time,
      };
      fights.push(currentFight);
    } else {
      // Otherwise, add the event to the current fight and update the end time
      currentFight.kills.push(event);
      currentFight.end = event.match_time;
    }
  });

  return fights;
}

export async function groupPlayerKillsIntoFights(
  mapId: number,
  playerName: string
) {
  type Fight = {
    kills: Kill[];
    start: number;
    end: number;
  };

  const killsByMapId = await prisma.kill.findMany({
    where: {
      MapDataId: mapId,
    },
  });

  const rezzesByMapId = await prisma.mercyRez.findMany({
    where: {
      MapDataId: mapId,
    },
  });

  if (killsByMapId.length === 0) return [];

  const events = [
    ...killsByMapId,
    ...rezzesByMapId.map((rez) => ({
      id: rez.id,
      scrimId: rez.scrimId,
      event_type: "mercy_rez" as $Enums.EventType,
      match_time: rez.match_time,
      attacker_team: rez.resurrecter_team,
      attacker_name: rez.resurrecter_player,
      attacker_hero: rez.resurrecter_hero,
      victim_team: rez.resurrectee_team,
      victim_name: rez.resurrectee_player,
      victim_hero: rez.resurrectee_hero,
      event_ability: "Resurrect",
      event_damage: 0,
      is_critical_hit: "0",
      is_environmental: "0",
      MapDataId: rez.MapDataId,
    })),
  ];

  // Sorting events by match_time
  events.sort((a, b) => a.match_time - b.match_time);

  const fights: Fight[] = [];
  let currentFight: Fight | null = null;

  events.forEach((event) => {
    const involvesPlayer =
      event.attacker_name === playerName || event.victim_name === playerName;

    if (!currentFight || event.match_time - currentFight.end > 15) {
      // Start a new fight
      if (involvesPlayer) {
        currentFight = {
          kills: [event],
          start: event.match_time,
          end: event.match_time,
        };
        fights.push(currentFight);
      } else {
        // Otherwise, start a fight with no kills (yet)
        currentFight = {
          kills: [],
          start: event.match_time,
          end: event.match_time,
        };
      }
      fights.push(currentFight);
    } else if (involvesPlayer) {
      // Add the event to the current fight and update the end time
      currentFight.kills.push(event);
      currentFight.end = event.match_time;
    } else {
      // If the event does not involve the player, we simply update the fight's end time without adding the event
      currentFight.end = event.match_time;
    }
  });

  return fights;
}
