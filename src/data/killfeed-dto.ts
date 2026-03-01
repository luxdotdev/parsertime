import prisma from "@/lib/prisma";
import { groupKillsIntoFights, type Fight } from "@/lib/utils";
import type { Kill } from "@prisma/client";

export type UltimateSpan = {
  id: number;
  ultimateId: number;
  playerName: string;
  playerTeam: string;
  playerHero: string;
  startTime: number;
  endTime: number;
  duration: number;
  depth: number;
  isInstant: boolean;
  diedDuringUlt: boolean;
  killsDuringUlt: Kill[];
  deathsDuringUlt: Kill[];
};

export type FightUltimateData = {
  fightIndex: number;
  fightStart: number;
  fightEnd: number;
  spans: UltimateSpan[];
};

export type KillfeedDisplayOptions = {
  showUltBrackets: boolean;
  showUltLabels: boolean;
  showUltStartEvents: boolean;
  showUltEndEvents: boolean;
  showUltKillHighlights: boolean;
};

export type KillfeedEvent =
  | { type: "kill"; data: Kill }
  | { type: "ult_start"; data: UltimateSpan }
  | { type: "ult_end"; data: UltimateSpan }
  | { type: "ult_instant"; data: UltimateSpan };

export const DEFAULT_KILLFEED_OPTIONS: KillfeedDisplayOptions = {
  showUltBrackets: false,
  showUltLabels: false,
  showUltStartEvents: false,
  showUltEndEvents: false,
  showUltKillHighlights: false,
};

const INSTANT_ULT_THRESHOLD = 1.0;
const NO_END_ULT_WINDOW = 5.0;

function assignNestingDepths(spans: UltimateSpan[]): void {
  const sorted = spans.sort((a, b) => a.startTime - b.startTime);
  const activeEndTimes: number[] = [];

  for (const span of sorted) {
    while (
      activeEndTimes.length > 0 &&
      activeEndTimes[activeEndTimes.length - 1] <= span.startTime
    ) {
      activeEndTimes.pop();
    }

    span.depth = activeEndTimes.length;

    let insertIdx = activeEndTimes.length;
    for (let i = activeEndTimes.length - 1; i >= 0; i--) {
      if (activeEndTimes[i] <= span.endTime) break;
      insertIdx = i;
    }
    activeEndTimes.splice(insertIdx, 0, span.endTime);
  }
}

function assignSpanToFight(span: UltimateSpan, fights: Fight[]): number | null {
  for (let i = 0; i < fights.length; i++) {
    const fight = fights[i];
    if (span.startTime <= fight.end && span.endTime >= fight.start) {
      return i;
    }
  }
  return null;
}

export async function getUltimateSpans(
  mapId: number
): Promise<FightUltimateData[]> {
  const [ultimateStarts, ultimateEnds, kills, fights] = await Promise.all([
    prisma.ultimateStart.findMany({
      where: { MapDataId: mapId },
      orderBy: { match_time: "asc" },
    }),
    prisma.ultimateEnd.findMany({
      where: { MapDataId: mapId },
      orderBy: { match_time: "asc" },
    }),
    prisma.kill.findMany({
      where: { MapDataId: mapId },
      orderBy: { match_time: "asc" },
    }),
    groupKillsIntoFights(mapId),
  ]);

  if (fights.length === 0) return [];

  const spans: UltimateSpan[] = [];
  const pairedEndIds = new Set<number>();

  for (const start of ultimateStarts) {
    const end = ultimateEnds.find(
      (e) =>
        !pairedEndIds.has(e.id) &&
        e.ultimate_id === start.ultimate_id &&
        e.player_name === start.player_name &&
        e.match_time >= start.match_time
    );

    if (end) {
      pairedEndIds.add(end.id);
    }

    const hasEnd = !!end;
    const rawEndTime = end?.match_time ?? start.match_time;
    const duration = rawEndTime - start.match_time;
    const isInstant = !hasEnd || duration <= INSTANT_ULT_THRESHOLD;

    const effectiveEnd = hasEnd
      ? rawEndTime
      : start.match_time + NO_END_ULT_WINDOW;

    const killsDuringUlt = kills.filter(
      (k) =>
        k.attacker_name === start.player_name &&
        k.match_time >= start.match_time &&
        k.match_time <= effectiveEnd
    );

    const deathsDuringUlt = kills.filter(
      (k) =>
        k.victim_name === start.player_name &&
        k.match_time >= start.match_time &&
        k.match_time <= effectiveEnd
    );

    const diedDuringUlt = hasEnd
      ? deathsDuringUlt.some((k) => k.match_time === rawEndTime)
      : false;

    spans.push({
      id: start.id,
      ultimateId: start.ultimate_id,
      playerName: start.player_name,
      playerTeam: start.player_team,
      playerHero: start.player_hero,
      startTime: start.match_time,
      endTime: effectiveEnd,
      duration,
      depth: 0,
      isInstant,
      diedDuringUlt,
      killsDuringUlt,
      deathsDuringUlt,
    });
  }

  const fightDataMap = new Map<number, FightUltimateData>();

  for (let i = 0; i < fights.length; i++) {
    fightDataMap.set(i, {
      fightIndex: i,
      fightStart: fights[i].start,
      fightEnd: fights[i].end,
      spans: [],
    });
  }

  for (const span of spans) {
    const fightIdx = assignSpanToFight(span, fights);
    if (fightIdx !== null) {
      fightDataMap.get(fightIdx)!.spans.push(span);
    }
  }

  const result: FightUltimateData[] = [];
  for (const [, fightData] of fightDataMap) {
    if (fightData.spans.length > 0) {
      assignNestingDepths(fightData.spans);
    }
    result.push(fightData);
  }

  return result.sort((a, b) => a.fightIndex - b.fightIndex);
}

export function hasAnyUltFeature(options: KillfeedDisplayOptions): boolean {
  return (
    options.showUltBrackets ||
    options.showUltStartEvents ||
    options.showUltEndEvents ||
    options.showUltKillHighlights
  );
}

export function mergeKillfeedEvents(
  kills: Kill[],
  spans: UltimateSpan[],
  options: KillfeedDisplayOptions
): KillfeedEvent[] {
  const events: KillfeedEvent[] = kills.map((k) => ({
    type: "kill" as const,
    data: k,
  }));

  const showStartRows = options.showUltStartEvents;
  const showEndRows = options.showUltEndEvents;

  if (showStartRows || showEndRows) {
    for (const span of spans) {
      if (span.isInstant) {
        if (showStartRows || showEndRows) {
          events.push({ type: "ult_instant", data: span });
        }
      } else {
        if (showStartRows) {
          events.push({ type: "ult_start", data: span });
        }
        if (showEndRows) {
          events.push({ type: "ult_end", data: span });
        }
      }
    }
  }

  events.sort((a, b) => {
    const timeA = getEventTime(a);
    const timeB = getEventTime(b);

    if (timeA !== timeB) return timeA - timeB;

    const priority = { ult_start: 0, kill: 1, ult_end: 2, ult_instant: 0 };
    return priority[a.type] - priority[b.type];
  });

  return events;
}

export function getEventTime(event: KillfeedEvent): number {
  if (event.type === "kill") return event.data.match_time;
  if (event.type === "ult_start") return event.data.startTime;
  if (event.type === "ult_instant") return event.data.startTime;
  return event.data.endTime;
}

export function isKillDuringUlt(
  kill: Kill,
  spans: UltimateSpan[]
): UltimateSpan | null {
  for (const span of spans) {
    if (
      kill.match_time >= span.startTime &&
      kill.match_time <= span.endTime &&
      kill.attacker_team === span.playerTeam
    ) {
      return span;
    }
  }
  return null;
}
