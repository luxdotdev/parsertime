import { ColorblindMode, type Kill } from "@/generated/prisma/browser";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { groupEventsIntoFights, mercyRezToKillEvent } from "@/lib/utils";

/** DB-backed helpers that used to live in utils.ts. They pull in the Prisma
 * singleton (and with it the pg driver), so they must stay out of utils.ts,
 * which is imported by client components for cn() and friends. */

export async function groupKillsIntoFights(mapId: number) {
  const mapDataId = await resolveMapDataId(mapId);
  return groupKillsIntoFightsByMapDataId(mapDataId);
}

export async function groupKillsIntoFightsByMapDataId(mapDataId: number) {
  const [killsByMapId, rezzesByMapId] = await Promise.all([
    prisma.kill.findMany({ where: { MapDataId: mapDataId } }),
    prisma.mercyRez.findMany({ where: { MapDataId: mapDataId } }),
  ]);

  if (killsByMapId.length === 0 && rezzesByMapId.length === 0) return [];

  const events: Kill[] = [
    ...killsByMapId,
    ...rezzesByMapId.map(mercyRezToKillEvent),
  ];

  events.sort((a, b) => a.match_time - b.match_time);

  return groupEventsIntoFights(events);
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

  const mapDataId = await resolveMapDataId(mapId);
  const [killsByMapId, rezzesByMapId] = await Promise.all([
    prisma.kill.findMany({ where: { MapDataId: mapDataId } }),
    prisma.mercyRez.findMany({ where: { MapDataId: mapDataId } }),
  ]);

  if (killsByMapId.length === 0) return [];

  const events = [
    ...killsByMapId,
    ...rezzesByMapId.map((rez) => mercyRezToKillEvent(rez)),
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

export async function getColorblindMode(userId: string) {
  const appSettings = await prisma.appSettings.findUnique({
    where: { userId },
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
    case ColorblindMode.CUSTOM:
      return {
        team1: appSettings.customTeam1Color ?? "var(--team-1-off)",
        team2: appSettings.customTeam2Color ?? "var(--team-2-off)",
      };
    default:
      return {
        team1: "var(--team-1-off)",
        team2: "var(--team-2-off)",
      };
  }
}
