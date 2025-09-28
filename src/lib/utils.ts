import prisma from "@/lib/prisma";
import { ColorblindMode, type $Enums, type Kill } from "@prisma/client";
import { clsx, type ClassValue } from "clsx";
import { useMessages, useTranslations } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
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
 * Formats a number by adding commas to the thousands place.
 *
 * @param {number} x - The number to format.
 * @returns {string} The formatted number as a string.
 */
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

/**
 * Converts a number of seconds to a string representation in the format "hours:minutes:seconds".
 *
 * @param value - The number of seconds to convert.
 * @returns A string representation of the time in the format "hours:minutes:seconds".
 */
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

/**
 * Converts a number of seconds to a string representation in the format "days:hours:minutes:seconds".
 *
 * @param value - The number of seconds to convert.
 * @returns A string representation of the time in the format "days:hours:minutes:seconds".
 */
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

/**
 * Removes duplicate rows from an array of objects based on their non-id properties.
 *
 * @param rows - An array of objects with an `id` property.
 * @returns A new array with duplicate rows removed, keeping the first occurrence of each unique set of non-id properties.
 */
export function removeDuplicateRows<T extends { id: number }>(rows: T[]): T[] {
  const uniqueSet = new Set<string>();
  return rows.filter((row) => {
    // Destructure the row to separate `id` from the rest of the properties
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = row;

    const uniqueString = JSON.stringify(rest);

    if (uniqueSet.has(uniqueString)) {
      return false;
    }
    uniqueSet.add(uniqueString);
    return true;
  });
}

/**
 * Generates an array of sequential numbers from 0 to `max - 1`.
 *
 * @param max - The maximum value (exclusive) of the range.
 * @returns An array of numbers from 0 to `max - 1`.
 */
export function range(max: number) {
  return Array.from({ length: max }, (_, i) => i);
}

export async function groupKillsIntoFights(mapId: number) {
  type Fight = {
    kills: Kill[];
    start: number;
    end: number;
  };

  const [killsByMapId, rezzesByMapId] = await Promise.all([
    prisma.kill.findMany({ where: { MapDataId: mapId } }),
    prisma.mercyRez.findMany({ where: { MapDataId: mapId } }),
  ]);

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

  const [killsByMapId, rezzesByMapId] = await Promise.all([
    prisma.kill.findMany({ where: { MapDataId: mapId } }),
    prisma.mercyRez.findMany({ where: { MapDataId: mapId } }),
  ]);

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

/**
 * Translates the given map name using the "maps" translation namespace.
 * This is the async server-side version of `useMapName`.
 *
 * @param name - The map name to translate.
 * @returns The translated map name.
 */
export async function translateMapName(name: string) {
  const t = await getTranslations("maps");
  return t(toKebabCase(name));
}

/**
 * Translates the given map name using the "maps" translation namespace.
 * This is the synchronous client-side version of `translateMapName`.
 *
 * @param name - The map name to translate.
 * @returns The translated map name.
 */
export function useMapName(name: string) {
  const t = useTranslations("maps");
  return t(toKebabCase(name));
}

/**
 * Retrieves a map of all available map names, with the map name as the key and the translated map name as the value.
 * This is an asynchronous function that fetches the map names from the "maps" translation namespace.
 *
 * @returns A Map of map names and their translated values.
 */
export async function getMapNames() {
  const mapNames = (await getMessages())["maps"] as Record<string, string>;
  return new Map<string, string>(Object.entries(mapNames));
}

/**
 * Retrieves a map of all available map names, with the map name as the key and the translated map name as the value.
 * This is a synchronous function that retrieves the map names from the "maps" translation namespace.
 *
 * @returns A Map of map names and their translated values.
 */
export function useMapNames() {
  const mapNames = useMessages()["maps"] as Record<string, string>;
  return new Map(Object.entries(mapNames));
}

/**
 * Translates the given map name using the "heroes" translation namespace.
 * This is the async server-side version of `useHeroName`.
 *
 * @param name - The map name to translate.
 * @returns The translated map name.
 */
export async function translateHeroName(name: string) {
  const t = await getTranslations("heroes");
  return t(toHero(name));
}

/**
 * Translates the given hero name using the "heroes" translation namespace.
 * This is the synchronous client-side version of `translateHeroName`.
 *
 * @param name - The map name to translate.
 * @returns The translated map name.
 */
export function useHeroName(name: string) {
  const t = useTranslations("heroes");
  return t(toHero(name));
}

/**
 * Retrieves a map of all available hero names, with the hero name as the key and the translated hero name as the value.
 * This is an asynchronous function that fetches the hero names from the "heroes" translation namespace.
 *
 * @returns A Map of hero names and their translated values.
 */
export async function getHeroNames() {
  const heroNames = (await getMessages())["heroes"] as Record<string, string>;
  return new Map<string, string>(Object.entries(heroNames));
}

/**
 * Retrieves a map of all available hero names, with the hero name as the key and the translated hero name as the value.
 * This is a synchronous function that retrieves the hero names from the "heroes" translation namespace.
 *
 * @returns A Map of hero names and their translated values.
 */
export function useHeroNames() {
  const heroNames = useMessages()["heroes"] as Record<string, string>;
  return new Map(Object.entries(heroNames));
}

export type TaggedError = {
  _tag: string;
};

/**
 * Checks if the given error is a tagged error.
 *
 * @param error - The error to check.
 * @returns True if the error is a tagged error, false otherwise.
 */
export function isTaggedError(error: unknown): error is TaggedError {
  return error instanceof Error && "_tag" in error;
}

export type CorruptionInfo = {
  isCorrupted: boolean;
  hasInvalidMercyRez: boolean;
  hasAsterisks: boolean;
};

/**
 * Detects corrupted data in file content using regex patterns
 *
 * @param fileContent - The file content to check for corruption
 * @returns Object containing corruption detection results
 */
export function detectCorruptedData(fileContent: string): CorruptionInfo {
  // Check for invalid mercy_rez lines (mercy_rez with empty fields between commas)
  const mercyRezPattern =
    /^(?=[\s\S]*\bmercy_rez\b)[\s\S]*?(?:^|[^,])(,,)(?!,)/;
  const hasInvalidMercyRez = mercyRezPattern.test(fileContent);

  // Check for asterisk values (corrupted numeric data)
  const asteriskPattern = /,\*+,/;
  const hasAsterisks = asteriskPattern.test(fileContent);

  return {
    isCorrupted: hasInvalidMercyRez || hasAsterisks,
    hasInvalidMercyRez,
    hasAsterisks,
  };
}

/**
 * Safely detects corrupted data from a file, handling potential errors
 *
 * @param file - The file to check for corruption
 * @returns Promise resolving to corruption detection results
 */
export async function detectFileCorruption(
  file: File
): Promise<CorruptionInfo> {
  try {
    const fileContent = await file.text();
    return detectCorruptedData(fileContent);
  } catch {
    // If file reading fails, return no corruption detected
    return {
      isCorrupted: false,
      hasInvalidMercyRez: false,
      hasAsterisks: false,
    };
  }
}

export async function getColorblindMode(email: string) {
  const appSettings = await prisma.appSettings.findFirst({
    where: { userId: email },
  });
  switch (appSettings?.colorblindMode) {
    case ColorblindMode.OFF:
      return {
        team1: "var(--team-1-off)",
        team2: "var(--team-2-off)",
      };
    case ColorblindMode.DEUTERANOPIA:
      return {
        team1: "var(--team-1-deuteranopia)",
        team2: "var(--team-2-deuteranopia)",
      };
    case ColorblindMode.PROTANOPIA:
      return {
        team1: "var(--team-1-protanopia)",
        team2: "var(--team-2-protanopia)",
      };
    case ColorblindMode.TRITANOPIA:
      return {
        team1: "var(--team-1-tritanopia)",
        team2: "var(--team-2-tritanopia)",
      };
    default:
      return {
        team1: "var(--team-1-off)",
        team2: "var(--team-2-off)",
      };
  }
}
