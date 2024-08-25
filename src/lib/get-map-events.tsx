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

export async function getMapEvents(id: number) {
  const t = await getTranslations("mapPage.events");
  const matchStart = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
  });

  if (!matchStart) return [];

  const captureString = () => {
    switch (matchStart.map_type) {
      case "Control":
      case "Flashpoint":
        return t("mapEvents.captureString1");
      default:
        return t("mapEvents.captureString2");
    }
  };

  const matchEnd = await prisma.matchEnd.findFirst({
    where: {
      MapDataId: id,
    },
  });

  const roundStarts = await prisma.roundStart.findMany({
    where: {
      MapDataId: id,
    },
  });

  const roundEnds = removeDuplicateRows(
    await prisma.roundEnd.findMany({
      where: {
        MapDataId: id,
      },
    })
  );

  const objectiveCaptureds = (
    await prisma.objectiveCaptured.findMany({
      where: {
        MapDataId: id,
      },
    })
  ).filter((event) => {
    return event.capturing_team !== "All Teams";
  });

  const objectiveUpdateds =
    matchStart!.map_type === "Control" || matchStart!.map_type === "Flashpoint"
      ? await prisma.objectiveUpdated.findMany({
          where: {
            MapDataId: id,
          },
        })
      : [];

  const kills = await prisma.kill.findMany({
    where: {
      MapDataId: id,
    },
  });

  const ultimateStarts = await prisma.ultimateStart.findMany({
    where: {
      MapDataId: id,
    },
  });

  const ultimateEnds = await prisma.ultimateEnd.findMany({
    where: {
      MapDataId: id,
    },
  });

  const heroSwaps = await prisma.heroSwap.findMany({
    where: {
      MapDataId: id,
      match_time: {
        not: 0,
      },
    },
  });

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

  const lucioKills = await prisma.kill.findMany({
    where: {
      MapDataId: id,
      victim_hero: "Lúcio",
    },
  });

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
          <p className="p-2" key={event}>
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
          <p className="p-2 font-bold" key={event}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            {t("mapEvents.objectiveUpdate")}
          </p>
        );
      case "payload_progress":
        return (
          <p className="p-2" key={event}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            {t("mapEvents.payloadProgress")}
            <span
              className={cn(
                event.capturing_team === matchStart.team_1_name
                  ? "text-blue-500"
                  : "text-red-500"
              )}
            >
              {event.capturing_team}
            </span>{" "}
            {event.payload_capture_progress} {t("mapEvents.meters")}
          </p>
        );
      case "hero_swap":
        return (
          <div className="flex items-center gap-1 p-2" key={event}>
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
            {t("mapEvents.swap")}{" "}
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
          <div className="flex items-center gap-1 p-2" key={event}>
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
            {t("mapEvents.ultKills1")} {event.kills.length}{" "}
            {t("mapEvents.ultKills2")}
            {event.kills.length > 1 ? t("mapEvents.ultKills3") : ""}{" "}
            {t("mapEvents.ultKills4")}
          </div>
        );
      case "round_start":
        return (
          <p className="p-2 font-bold" key={event}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            {t("roundStart1")} {event.round_number} {t("roundStart2")}
          </p>
        );
      case "round_end":
        return (
          <div className="p-2 font-bold" key={event}>
            <p>
              <span className={GeistMono.className}>
                {toTimestamp(event.match_time)} -{" "}
              </span>{" "}
              {t("roundEnd1")} {event.round_number} {t("roundEnd2")}
            </p>
            <div className="py-3" />
          </div>
        );
      case "match_end":
        return (
          <p className="p-2 font-bold" key={event}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            {t("matchEnd")}
          </p>
        );
      case "match_start":
        return (
          <p className="p-2 font-bold" key={event}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            {t("matchStart")}
            <div className="py-3" />
          </p>
        );
      case "multikill":
        return (
          <div className="flex items-center gap-2 p-2" key={event}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            {t("mapEvents.multikill1")} {event.fightIndex + 1},{" "}
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
            {t("mapEvents.multikill2")} {event.killTimes.length}{" "}
            {t("mapEvents.multikill3")}
          </div>
        );
      case "ajax":
        return (
          <div className="flex items-center gap-2 p-2" key={event}>
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
            {t("mapEvents.ajaxFight")}{" "}
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
  const t = await getTranslations("mapPage.events");
  const ultimateStarts = (
    await prisma.ultimateStart.findMany({
      where: {
        MapDataId: id,
      },
    })
  )
    // filter out ultimate starts that happen within 1 second for the same player
    .filter((start, index, array) => {
      const nextStart = array[index + 1];
      if (nextStart) {
        return nextStart.match_time - start.match_time > 1;
      }
      return true;
    });

  const matchStart = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
  });

  if (!matchStart) return [];

  const matchEnd = await prisma.matchEnd.findFirst({
    where: {
      MapDataId: id,
    },
  });

  const roundStarts = await prisma.roundStart.findMany({
    where: {
      MapDataId: id,
    },
  });

  const roundEnds = removeDuplicateRows(
    await prisma.roundEnd.findMany({
      where: {
        MapDataId: id,
      },
    })
  );

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
          <p className="p-2 font-bold" key={event}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>
            {t("roundStart1")} {event.round_number} {t("roundStart2")}
          </p>
        );
      case "round_end":
        return (
          <div className="p-2 font-bold" key={event}>
            <p>
              <span className={GeistMono.className}>
                {toTimestamp(event.match_time)} -{" "}
              </span>{" "}
              {t("roundEnd1")} {event.round_number} {t("roundEnd2")}
            </p>
            <div className="py-3" />
          </div>
        );
      case "match_end":
        return (
          <p className="p-2 font-bold" key={event}>
            <span className={GeistMono.className}>
              {toTimestamp(event.match_time)} -{" "}
            </span>{" "}
            {t("matchEnd")}
          </p>
        );
      case "match_start":
        return (
          <p className="p-2 font-bold" key={event}>
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
            {t("ultsUsed.ultStart")}{" "}
            {fights.findIndex((fight) => {
              return fight.end >= event.match_time;
            }) + 1}
            .
          </div>
        );
    }
  });
}
