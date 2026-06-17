type Point = { u: number; v: number };

export type KillPoint = Point & {
  team: 1 | 2;
  attackerName: string;
  attackerHero: string;
  victimName: string;
  victimHero: string;
  ability: string;
  matchTime: number;
};

export type HeatmapSubMap = {
  subMapName: string;
  calibrationMapName: string;
  imagePresignedUrl: string;
  imageWidth: number;
  imageHeight: number;
  damagePoints: Point[];
  healingPoints: Point[];
  killPoints: KillPoint[];
};

export type HeatmapData =
  | { type: "single"; subMap: HeatmapSubMap }
  | { type: "control"; subMaps: HeatmapSubMap[] }
  | { type: "no_calibration" }
  | { type: "no_coordinates" };

export type TimedCoord = {
  match_time: number;
  x: number | null;
  z: number | null;
};

export type TimedKillCoord = TimedCoord & {
  victim_team: string;
  attacker_name: string;
  attacker_hero: string;
  victim_name: string;
  victim_hero: string;
  event_ability: string;
};

export type EventsByCategory = {
  damage: TimedCoord[];
  healing: TimedCoord[];
  kills: TimedKillCoord[];
};
