/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

// I cannot be bothered to fix the typing for the `event` variable
// It is annoyingly complicated, and I don't want to spend time on it
// It works at runtime, so I'm not going to fix it

import prisma from "@/lib/prisma";
import {
  getHeroNames,
  groupKillsIntoFights,
  removeDuplicateRows,
  toHero,
  toTimestamp,
} from "@/lib/utils";
import type { TODO } from "@/types/utils";
import type { $Enums, Kill, UltimateEnd } from "@prisma/client";
import { GeistMono } from "geist/font/mono";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

type MultikillEvent = {
  fightIndex: number;
  player_name: string;
  killTimes: number[];
  event_type: "multikill";
  match_time: number;
  player_team: string;
  player_hero: string;
};

type Fight = {
  kills: Kill[];
  start: number;
  end: number;
};

function findMultikills(fights: Fight[]): MultikillEvent[] {
  const multikillEvents: MultikillEvent[] = [];

  fights.forEach((fight, fightIndex) => {
    const killCounter: { [key: string]: number[] } = {};

    // Count kills per player within this fight
    fight.kills.forEach((kill) => {
      if (kill.match_time >= fight.start && kill.match_time <= fight.end) {
        if (!killCounter[kill.attacker_name]) {
          killCounter[kill.attacker_name] = [kill.match_time];
        } else {
          killCounter[kill.attacker_name].push(kill.match_time);
        }
      }
    });

    // Identify multikills
    for (const [player_name, killTimes] of Object.entries(killCounter)) {
      if (killTimes.length > 2) {
        // Multikill criteria, adjust if needed
        multikillEvents.push({
          fightIndex,
          player_name,
          killTimes,
          event_type: "multikill",
          match_time: killTimes[0],
          player_team: fight.kills.find(
            (kill) => kill.attacker_name === player_name
          )!.attacker_team,
          player_hero: fight.kills.find(
            (kill) => kill.attacker_name === player_name
          )!.attacker_hero,
        });
      }
    }
  });

  return multikillEvents;
}

// Define event priority if they happen at the same time
const priority: Record<string, number> = {
  objective_captured: 0,
  objective_updated: 1,
  round_end: 2,
  round_start: 3,
  match_end: 4,
};

export async function getMapEvents(
  id: number,
  team1Color: string,
  team2Color: string
) {
  const [
    matchStart,
    matchEnd,
    roundStarts,
    roundEndRows,
    objectiveCapturedRows,
    kills,
    ultimateStarts,
    ultimateEnds,
    heroSwaps,
    lucioKills,
  ] = await Promise.all([
    prisma.matchStart.findFirst({
      where: { MapDataId: id },
    }),
    prisma.matchEnd.findFirst({
      where: { MapDataId: id },
    }),
    prisma.roundStart.findMany({
      where: { MapDataId: id },
    }),
    prisma.roundEnd.findMany({
      where: { MapDataId: id },
    }),
    prisma.objectiveCaptured.findMany({
      where: { MapDataId: id },
    }),
    prisma.kill.findMany({
      where: { MapDataId: id },
    }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: id },
    }),
    prisma.ultimateEnd.findMany({
      where: { MapDataId: id },
    }),
    prisma.heroSwap.findMany({
      where: { MapDataId: id, match_time: { not: 0 } },
    }),
    prisma.kill.findMany({
      where: { MapDataId: id, victim_hero: "Lúcio" },
    }),
  ]);

  const t = await getTranslations("mapPage.events");
  const heroNames = await getHeroNames();

  if (!matchStart) return [];

  function captureString(team: string) {
    switch (matchStart!.map_type) {
      case "Control":
      case "Flashpoint":
        return t.rich("mapEvents.captureString1", {
          color: (chunks) => (
            <span
              style={{
                color:
                  team === matchStart!.team_1_name ? team1Color : team2Color,
              }}
            >
              {chunks}
            </span>
          ),
          team,
        });
      default:
        return t.rich("mapEvents.captureString2", {
          color: (chunks) => (
            <span
              style={{
                color:
                  team === matchStart!.team_1_name ? team1Color : team2Color,
              }}
            >
              {chunks}
            </span>
          ),
          team,
        });
    }
  }

  const roundEnds = removeDuplicateRows(roundEndRows);

  const objectiveCaptureds = objectiveCapturedRows.filter((event) => {
    return event.capturing_team !== "All Teams";
  });

  const objectiveUpdateds =
    matchStart.map_type === "Control" || matchStart.map_type === "Flashpoint"
      ? await prisma.objectiveUpdated.findMany({
          where: {
            MapDataId: id,
          },
        })
      : [];

  const fights = await groupKillsIntoFights(id);

  const ultimateKills = ultimateStarts.flatMap((start) => {
    const end = ultimateEnds.find(
      (end) =>
        end.ultimate_id === start.ultimate_id &&
        end.player_name === start.player_name
    );
    if (!end) return []; // Skip if there's no matching end event

    const killsDuringUltimate = kills.filter((kill) => {
      return (
        kill.attacker_name === start.player_name &&
        kill.match_time >= start.match_time &&
        kill.match_time <= end.match_time
      );
    });

    if (killsDuringUltimate.length > 0) {
      return {
        event_type: "ultimate_kills",
        ultimate_id: start.ultimate_id,
        player_name: start.player_name,
        player_team: start.player_team,
        player_hero: start.player_hero,
        match_time: start.match_time,
        kills: killsDuringUltimate,
      };
    }
    return [];
  });

  const multikillList = findMultikills(fights);

  const ajaxes: UltimateEnd[] = [];

  lucioKills.forEach((kill) => {
    const ajax = ultimateEnds.find(
      (end) =>
        end.player_name === kill.victim_name &&
        end.match_time === kill.match_time
    );

    if (ajax) {
      ajaxes.push({
        ...ajax,
        event_type: "ajax" as $Enums.EventType,
      });
    }
  });

  const events = [
    matchStart,
    matchEnd ?? null,
    ...roundStarts,
    ...roundEnds,
    ...objectiveCaptureds,
    ...objectiveUpdateds,
    ...heroSwaps,
    ...ultimateKills,
    ...multikillList,
    ...ajaxes,
  ]
    .filter(Boolean) // Remove nulls
    .sort((a, b) => {
      if (a.match_time === b.match_time) {
        return priority[a.event_type] - priority[b.event_type];
      }
      return a.match_time - b.match_time;
    })
    // remove objective updated at time 0 for control maps
    .filter((event, index, array) => {
      if (event.event_type === "objective_updated") {
        return array[index + 1].event_type !== "round_start";
      }
      return true;
    });

  const eventList = events.map((event: TODO) => {
    switch (event.event_type) {
      case "objective_captured":
        return (
          <p className="p-2" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            {captureString(event.capturing_team)}
          </p>
        );
      case "objective_updated":
        return (
          <p className="p-2 font-bold" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            {t("mapEvents.objectiveUpdate")}
          </p>
        );
      case "hero_swap":
        return (
          <div className="flex items-center gap-1 p-2" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            <span className="inline-flex items-center gap-1 pl-1">
              {t.rich("mapEvents.swap", {
                img1: () => (
                  <Image
                    src={`/heroes/${toHero(event.previous_hero)}.png`}
                    alt={`${event.player_name}'s hero`}
                    width={256}
                    height={256}
                    className="h-8 w-8 rounded border-2"
                    style={{
                      border:
                        event.player_team === matchStart.team_1_name
                          ? `2px solid ${team1Color}`
                          : `2px solid ${team2Color}`,
                    }}
                  />
                ),
                color: (chunks) => (
                  <span
                    style={{
                      color:
                        event.player_team === matchStart.team_1_name
                          ? team1Color
                          : team2Color,
                    }}
                  >
                    {chunks}
                  </span>
                ),
                img2: () => (
                  <Image
                    src={`/heroes/${toHero(event.player_hero)}.png`}
                    alt={`${event.player_name}'s new hero`}
                    width={256}
                    height={256}
                    className="h-8 w-8 rounded border-2"
                    style={{
                      border:
                        event.player_team === matchStart.team_1_name
                          ? `2px solid ${team1Color}`
                          : `2px solid ${team2Color}`,
                    }}
                  />
                ),
                hero:
                  heroNames.get(toHero(event.player_hero)) ?? event.player_hero,
                player: event.player_name,
              })}
            </span>
          </div>
        );
      case "ultimate_kills":
        return (
          <div className="flex items-center gap-1 p-2" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            <div className="inline-flex items-center gap-1 pl-1">
              {t.rich("mapEvents.ultKills", {
                img: () => (
                  <Image
                    src={`/heroes/${toHero(event.player_hero)}.png`}
                    alt={`${event.player_name}'s hero`}
                    width={256}
                    height={256}
                    className="h-8 w-8 rounded border-2"
                    style={{
                      border:
                        event.player_team === matchStart.team_1_name
                          ? `2px solid ${team1Color}`
                          : `2px solid ${team2Color}`,
                    }}
                  />
                ),
                color: (chunks) => (
                  <span
                    style={{
                      color:
                        event.player_team === matchStart.team_1_name
                          ? team1Color
                          : team2Color,
                    }}
                  >
                    {chunks}
                  </span>
                ),
                player: event.player_name,
                players: event.kills.length,
              })}
            </div>
          </div>
        );
      case "round_start":
        return (
          <p className="p-2 font-bold" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            {t("roundStart", { event: event.round_number })}
          </p>
        );
      case "round_end":
        return (
          <div className="p-2 font-bold" key={event.match_time}>
            <p>
              <span className={GeistMono.className}>
                {toTimestamp(event.match_time)} -{" "}
              </span>{" "}
              {t("roundEnd", { event: event.round_number })}
            </p>
            <div className="py-3" />
          </div>
        );
      case "match_end":
        return (
          <p className="p-2 font-bold" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            {t("matchEnd")}
          </p>
        );
      case "match_start":
        return (
          <p className="p-2 font-bold" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            {t("matchStart")}
            <div className="py-3" />
          </p>
        );
      case "multikill":
        return (
          <div className="flex items-center gap-2 p-2" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            {t.rich("mapEvents.multikill", {
              event: event.fightIndex + 1,
              span: (chunks) => (
                <span className="inline-flex items-center gap-1">{chunks}</span>
              ),
              img: () => (
                <Image
                  src={`/heroes/${toHero(event.player_hero)}.png`}
                  alt={`${event.player_name}'s hero`}
                  width={256}
                  height={256}
                  className="h-8 w-8 rounded border-2"
                  style={{
                    border:
                      event.player_team === matchStart.team_1_name
                        ? `2px solid ${team1Color}`
                        : `2px solid ${team2Color}`,
                  }}
                />
              ),
              color: (chunks) => (
                <span
                  style={{
                    color:
                      event.player_team === matchStart.team_1_name
                        ? team1Color
                        : team2Color,
                  }}
                >
                  {chunks}
                </span>
              ),
              player: event.player_name,
              kills: event.killTimes.length,
            })}
          </div>
        );
      case "ajax":
        return (
          <div className="flex items-center gap-2 p-2" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            {t.rich("mapEvents.ajax", {
              span: (chunks) => (
                <span className="inline-flex items-center gap-1">{chunks}</span>
              ),
              img: () => (
                <Image
                  src={`/heroes/${toHero(event.player_hero)}.png`}
                  alt={`${event.player_name}'s hero`}
                  width={256}
                  height={256}
                  className="h-8 w-8 rounded border-2"
                  style={{
                    border:
                      event.player_team === matchStart.team_1_name
                        ? `2px solid ${team1Color}`
                        : `2px solid ${team2Color}`,
                  }}
                />
              ),
              color: (chunks) => (
                <span
                  style={{
                    color:
                      event.player_team === matchStart.team_1_name
                        ? team1Color
                        : team2Color,
                  }}
                >
                  {chunks}
                </span>
              ),
              player: event.player_name,
              fight:
                fights.findIndex((fight) => {
                  return fight.end >= event.match_time;
                }) + 1,
            })}
          </div>
        );
    }
  });

  return eventList;
}

export async function getUltimatesUsedList(
  id: number,
  team1Color: string,
  team2Color: string
) {
  const t = await getTranslations("mapPage.events");

  const [ultimateStartRows, matchStart, matchEnd, roundStarts, roundEndRows] =
    await Promise.all([
      prisma.ultimateStart.findMany({
        where: { MapDataId: id },
      }),
      prisma.matchStart.findFirst({
        where: { MapDataId: id },
      }),
      prisma.matchEnd.findFirst({
        where: { MapDataId: id },
      }),
      prisma.roundStart.findMany({
        where: { MapDataId: id },
      }),
      prisma.roundEnd.findMany({
        where: { MapDataId: id },
      }),
    ]);

  const ultimateStarts = ultimateStartRows
    // filter out ultimate starts that happen within 1 second for the same player
    .filter((start, index, array) => {
      const nextStart = array[index + 1];
      if (nextStart) {
        return nextStart.match_time - start.match_time > 1;
      }
      return true;
    });

  if (!matchStart) return [];

  const roundEnds = removeDuplicateRows(roundEndRows);

  const fights = await groupKillsIntoFights(id);

  const events = [
    matchStart,
    matchEnd ?? null,
    ...roundStarts,
    ...roundEnds,
    ...ultimateStarts,
  ]
    .filter(Boolean)
    .sort((a, b) => {
      if (a.match_time === b.match_time) {
        return priority[a.event_type] - priority[b.event_type];
      }
      return a.match_time - b.match_time;
    });

  return events.map((event: TODO) => {
    switch (event.event_type) {
      case "round_start":
        return (
          <p className="p-2 font-bold" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            {t("roundStart", { event: event.round_number })}
          </p>
        );
      case "round_end":
        return (
          <div className="p-2 font-bold" key={event.match_time}>
            <p>
              <span className={GeistMono.className}>
                {toTimestamp(event.match_time)} -{" "}
              </span>{" "}
              {t("roundEnd", { event: event.round_number })}
            </p>
            <div className="py-3" />
          </div>
        );
      case "match_end":
        return (
          <p className="p-2 font-bold" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            {t("matchEnd")}
          </p>
        );
      case "match_start":
        return (
          <p className="p-2 font-bold" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            {t("matchStart")}
            <div className="py-3" />
          </p>
        );
      case "ultimate_start":
        return (
          <div className="flex items-center gap-2 p-2" key={event.id}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            {t.rich("ultsUsed.ultStart", {
              span: (chunks) => (
                <span className="inline-flex items-center gap-1">{chunks}</span>
              ),
              img: () => (
                <Image
                  src={`/heroes/${toHero(event.player_hero)}.png`}
                  alt={`${event.player_name}'s hero`}
                  width={256}
                  height={256}
                  className="h-8 w-8 rounded border-2"
                  style={{
                    border:
                      event.player_team === matchStart.team_1_name
                        ? `2px solid ${team1Color}`
                        : `2px solid ${team2Color}`,
                  }}
                />
              ),
              color: (chunks) => (
                <span
                  style={{
                    color:
                      event.player_team === matchStart.team_1_name
                        ? team1Color
                        : team2Color,
                  }}
                >
                  {chunks}
                </span>
              ),
              player: event.player_name,
              fight:
                fights.findIndex((fight) => {
                  return fight.end >= event.match_time;
                }) + 1,
            })}
          </div>
        );
    }
  });
}
