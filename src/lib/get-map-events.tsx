/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

// I cannot be bothered to fix the typing for the `event` variable
// It is annoyingly complicated, and I don't want to spend time on it\
// It works at runtime, so I'm not going to fix it

import prisma from "@/lib/prisma";
import {
  cn,
  groupKillsIntoFights,
  removeDuplicateRows,
  toHero,
  toTimestamp,
} from "@/lib/utils";
import { TODO } from "@/types/utils";
import { $Enums, Kill, UltimateEnd } from "@prisma/client";
import { GeistMono } from "geist/font/mono";
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

export async function getMapEvents(id: number) {
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

  if (!matchStart) return [];

  const captureString = () => {
    switch (matchStart.map_type) {
      case "Control":
      case "Flashpoint":
        return "took control of the point.";
      default:
        return "captured the objective.";
    }
  };

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

  const ajaxes = [] as UltimateEnd[];

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
    matchEnd ? matchEnd : null,
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
            <span
              className={cn(
                event.capturing_team === matchStart.team_1_name
                  ? "text-blue-500"
                  : "text-red-500"
              )}
            >
              {event.capturing_team}
            </span>{" "}
            {captureString()}
          </p>
        );
      case "objective_updated":
        return (
          <p className="p-2 font-bold" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            Point captured
          </p>
        );
      case "payload_progress":
        return (
          <p className="p-2" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            Payload progress:
            <span
              className={cn(
                event.capturing_team === matchStart.team_1_name
                  ? "text-blue-500"
                  : "text-red-500"
              )}
            >
              {event.capturing_team}
            </span>{" "}
            {event.payload_capture_progress} meters
          </p>
        );
      case "hero_swap":
        return (
          <div className="flex items-center gap-1 p-2" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            <span className="inline-flex items-center gap-1 pl-1">
              <Image
                src={`/heroes/${toHero(event.previous_hero)}.png`}
                alt={`${event.player_name}'s hero`}
                width={256}
                height={256}
                className={cn(
                  "h-8 w-8 rounded border-2",
                  event.player_team === matchStart.team_1_name
                    ? "border-blue-500"
                    : "border-red-500"
                )}
              />
              <span
                className={cn(
                  event.player_team === matchStart.team_1_name
                    ? "text-blue-500"
                    : "text-red-500"
                )}
              >
                {event.player_name}
              </span>
            </span>{" "}
            swapped to{" "}
            <Image
              src={`/heroes/${toHero(event.player_hero)}.png`}
              alt={`${event.player_name}'s new hero`}
              width={256}
              height={256}
              className={cn(
                "h-8 w-8 rounded border-2",
                event.player_team === matchStart.team_1_name
                  ? "border-blue-500"
                  : "border-red-500"
              )}
            />{" "}
            {event.player_hero}.
          </div>
        );
      case "ultimate_kills":
        return (
          <div className="flex items-center gap-1 p-2" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            <span className="inline-flex items-center gap-1 pl-1">
              <Image
                src={`/heroes/${toHero(event.player_hero)}.png`}
                alt={`${event.player_name}'s hero`}
                width={256}
                height={256}
                className={cn(
                  "h-8 w-8 rounded border-2",
                  event.player_team === matchStart.team_1_name
                    ? "border-blue-500"
                    : "border-red-500"
                )}
              />
              <span
                className={cn(
                  event.player_team === matchStart.team_1_name
                    ? "text-blue-500"
                    : "text-red-500"
                )}
              >
                {event.player_name}
              </span>
            </span>{" "}
            killed {event.kills.length} player
            {event.kills.length > 1 ? "s" : ""} with/during their ultimate.
          </div>
        );
      case "round_start":
        return (
          <p className="p-2 font-bold" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            Round {event.round_number} started
          </p>
        );
      case "round_end":
        return (
          <div className="p-2 font-bold" key={event.match_time}>
            <p>
              <span className={GeistMono.className}>
                {toTimestamp(event.match_time)} -{" "}
              </span>{" "}
              Round {event.round_number} ended
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
            Match ended
          </p>
        );
      case "match_start":
        return (
          <p className="p-2 font-bold" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            Match started
            <div className="py-3" />
          </p>
        );
      case "multikill":
        return (
          <div className="flex items-center gap-2 p-2" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            During fight {event.fightIndex + 1},{" "}
            <span className="inline-flex items-center gap-1">
              <Image
                src={`/heroes/${toHero(event.player_hero)}.png`}
                alt={`${event.player_name}'s hero`}
                width={256}
                height={256}
                className={cn(
                  "h-8 w-8 rounded border-2",
                  event.player_team === matchStart.team_1_name
                    ? "border-blue-500"
                    : "border-red-500"
                )}
              />
              <span
                className={cn(
                  event.player_team === matchStart.team_1_name
                    ? "text-blue-500"
                    : "text-red-500"
                )}
              >
                {event.player_name}
              </span>
            </span>{" "}
            got a multikill, killing {event.killTimes.length} players.
          </div>
        );
      case "ajax":
        return (
          <div className="flex items-center gap-2 p-2" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            <span className="inline-flex items-center gap-1">
              <Image
                src={`/heroes/${toHero(event.player_hero)}.png`}
                alt={`${event.player_name}'s hero`}
                width={256}
                height={256}
                className={cn(
                  "h-8 w-8 rounded border-2",
                  event.player_team === matchStart.team_1_name
                    ? "border-blue-500"
                    : "border-red-500"
                )}
              />
              <span
                className={cn(
                  event.player_team === matchStart.team_1_name
                    ? "text-blue-500"
                    : "text-red-500"
                )}
              >
                {event.player_name}
              </span>
            </span>{" "}
            Ajaxed during fight{" "}
            {fights.findIndex((fight) => {
              return fight.end >= event.match_time;
            }) + 1}
            .
          </div>
        );
    }
  });

  return eventList;
}

export async function getUltimatesUsedList(id: number) {
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
    matchEnd ? matchEnd : null,
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
            Round {event.round_number} started
          </p>
        );
      case "round_end":
        return (
          <div className="p-2 font-bold" key={event.match_time}>
            <p>
              <span className={GeistMono.className}>
                {toTimestamp(event.match_time)} -{" "}
              </span>{" "}
              Round {event.round_number} ended
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
            Match ended
          </p>
        );
      case "match_start":
        return (
          <p className="p-2 font-bold" key={event.match_time}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            Match started
            <div className="py-3" />
          </p>
        );
      case "ultimate_start":
        return (
          <div className="flex items-center gap-2 p-2" key={event.id}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            <span className="inline-flex items-center gap-1">
              <Image
                src={`/heroes/${toHero(event.player_hero)}.png`}
                alt={`${event.player_name}'s hero`}
                width={256}
                height={256}
                className={cn(
                  "h-8 w-8 rounded border-2",
                  event.player_team === matchStart.team_1_name
                    ? "border-blue-500"
                    : "border-red-500"
                )}
              />
              <span
                className={cn(
                  event.player_team === matchStart.team_1_name
                    ? "text-blue-500"
                    : "text-red-500"
                )}
              >
                {event.player_name}
              </span>
            </span>{" "}
            used their ultimate during fight{" "}
            {fights.findIndex((fight) => {
              return fight.end >= event.match_time;
            }) + 1}
            .
          </div>
        );
    }
  });
}
