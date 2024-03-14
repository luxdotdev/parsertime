import { PlayerStatRows } from "@/types/prisma";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import prisma from "@/lib/prisma";
import { Kill } from "@prisma/client";

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

  if (killsByMapId.length === 0) return [];

  const fights: Fight[] = [];
  let currentFight: Fight | null = null;

  killsByMapId.forEach((kill) => {
    if (!currentFight || kill.match_time - currentFight.end > 15) {
      // If there's no current fight or we're past the 15 second window, start a new fight
      currentFight = {
        kills: [kill],
        start: kill.match_time,
        end: kill.match_time,
      };
      fights.push(currentFight);
    } else {
      // Otherwise, add the kill to the current fight and update the end time
      currentFight.kills.push(kill);
      currentFight.end = kill.match_time;
    }
  });

  return fights;
}
