import type { Kill } from "@prisma/client";
import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import type { $Enums } from "@prisma/client";

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
  showTimeline: boolean;
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
  showTimeline: false,
  showUltBrackets: false,
  showUltLabels: false,
  showUltStartEvents: false,
  showUltEndEvents: false,
  showUltKillHighlights: false,
};

export type KillfeedCalibrationData = {
  calibrations: Map<string, LoadedCalibration>;
  mapName: string;
  mapType: $Enums.MapType;
  roundStarts: { match_time: number; objective_index: number }[];
};

export type SerializedCalibrationData = {
  calibrations: Record<string, LoadedCalibration>;
  mapName: string;
  mapType: string;
  roundStarts: { match_time: number; objective_index: number }[];
} | null;

// ── Pure helpers (safe for client components) ────────────────────────

export function hasAnyUltFeature(options: KillfeedDisplayOptions): boolean {
  return (
    options.showUltBrackets ||
    options.showUltStartEvents ||
    options.showUltEndEvents ||
    options.showUltKillHighlights
  );
}

export function getEventTime(event: KillfeedEvent): number {
  if (event.type === "kill") return event.data.match_time;
  if (event.type === "ult_start") return event.data.startTime;
  if (event.type === "ult_instant") return event.data.startTime;
  return event.data.endTime;
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
