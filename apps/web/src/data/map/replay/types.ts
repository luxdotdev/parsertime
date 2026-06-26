import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";

export type PositionSample = {
  t: number;
  playerName: string;
  playerTeam: string;
  hero: string;
  x: number;
  z: number;
};

export type KillDisplayEvent = {
  type: "kill";
  t: number;
  attackerName: string;
  attackerTeam: string;
  attackerHero: string;
  victimName: string;
  victimTeam: string;
  victimHero: string;
  ability: string;
  damage: number;
};

export type UltDisplayEvent = {
  type: "ult_start" | "ult_end" | "ult_charged";
  t: number;
  playerName: string;
  playerTeam: string;
  playerHero: string;
  ultimateId: number;
};

export type HeroSwapDisplayEvent = {
  type: "hero_swap";
  t: number;
  playerName: string;
  playerTeam: string;
  playerHero: string;
  previousHero: string;
};

export type RoundDisplayEvent = {
  type: "round_start" | "round_end";
  t: number;
  roundNumber: number;
  objectiveIndex: number;
};

export type DisplayEvent =
  | KillDisplayEvent
  | UltDisplayEvent
  | HeroSwapDisplayEvent
  | RoundDisplayEvent;

export type ReplayCalibration = {
  calibrations: Record<string, LoadedCalibration>;
  mapName: string;
  mapType: string;
  roundStarts: { matchTime: number; objectiveIndex: number }[];
};

export type ReplayData =
  | {
      type: "ready";
      positionSamples: PositionSample[];
      displayEvents: DisplayEvent[];
      calibration: ReplayCalibration;
      team1Name: string;
      team2Name: string;
    }
  | { type: "no_calibration" }
  | { type: "no_coordinates" };
