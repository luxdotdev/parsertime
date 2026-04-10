import { Schema as S } from "effect";

// ── Tempo types & pure helpers (safe for client components) ──────────

export type TempoDataPoint = {
  time: number;
  team1: number;
  team2: number;
};

export type UltPin = {
  time: number;
  hero: string;
  playerName: string;
  team: "team1" | "team2";
};

export type FightBoundary = {
  start: number;
  end: number;
  fightNumber: number;
};

export type KillPin = {
  time: number;
  hero: string;
  playerName: string;
  victimHero: string;
  victimName: string;
  team: "team1" | "team2";
};

export type TempoChartData = {
  combinedSeries: TempoDataPoint[];
  killsSeries: TempoDataPoint[];
  ultsSeries: TempoDataPoint[];
  ultPins: UltPin[];
  killPins: KillPin[];
  fightBoundaries: FightBoundary[];
  matchStartTime: number;
  matchEndTime: number;
  team1Name: string;
  team2Name: string;
};

export function tempoPointsToSvgPath(
  points: { x: number; y: number }[]
): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;
  }

  const alpha = 0.5;

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / (6 / alpha);
    const cp1y = p1.y + (p2.y - p0.y) / (6 / alpha);
    const cp2x = p2.x - (p3.x - p1.x) / (6 / alpha);
    const cp2y = p2.y - (p3.y - p1.y) / (6 / alpha);

    d += `C${cp1x},${cp1y},${cp2x},${cp2y},${p2.x},${p2.y}`;
  }

  return d;
}

// ── Schema definitions ───────────────────────────────────────────────

export const MapDataIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "MapData ID must be a positive integer" })
);

export const MapIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "Map ID must be a positive integer" })
);

export const TeamIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "Team ID must be a positive integer" })
);

export const MapGroupCreateSchema = S.Struct({
  name: S.String,
  description: S.optional(S.String),
  teamId: S.Number,
  mapIds: S.Array(S.Number),
  category: S.optional(S.String),
  createdBy: S.String,
});

export const MapGroupUpdateSchema = S.Struct({
  name: S.optional(S.String),
  description: S.optional(S.String),
  mapIds: S.optional(S.Array(S.Number)),
  category: S.optional(S.String),
});
