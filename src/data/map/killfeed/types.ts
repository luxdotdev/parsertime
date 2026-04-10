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
