import prisma from "@/lib/prisma";
import {
  groupEventsIntoFights,
  mercyRezToKillEvent,
  type Fight,
} from "@/lib/utils";

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

type WeightedEvent = { time: number; weight: number };

const SIGMA = 5; // bandwidth in seconds
const SAMPLE_INTERVAL = 0.5; // sample every 0.5s
const TWO_SIGMA_SQ = 2 * SIGMA * SIGMA;

function gaussianKDE(
  events: WeightedEvent[],
  sampleStart: number,
  sampleEnd: number
): number[] {
  const n = Math.ceil((sampleEnd - sampleStart) / SAMPLE_INTERVAL) + 1;
  const values = new Array<number>(n).fill(0);

  for (const e of events) {
    // Only compute contributions within 3*sigma of the event
    const lo = Math.max(
      0,
      Math.floor((e.time - 3 * SIGMA - sampleStart) / SAMPLE_INTERVAL)
    );
    const hi = Math.min(
      n - 1,
      Math.ceil((e.time + 3 * SIGMA - sampleStart) / SAMPLE_INTERVAL)
    );
    for (let i = lo; i <= hi; i++) {
      const t = sampleStart + i * SAMPLE_INTERVAL;
      const diff = t - e.time;
      values[i] += e.weight * Math.exp(-(diff * diff) / TWO_SIGMA_SQ);
    }
  }

  return values;
}

export function computeTempoSeries(
  kills: { match_time: number; attacker_team: string }[],
  ultStarts: { match_time: number; player_team: string }[],
  team1Name: string,
  matchStart: number,
  matchEnd: number,
  mode: "combined" | "kills" | "ults"
): TempoDataPoint[] {
  const killWeight = 1.0;
  const ultWeight = 0.6;

  const team1Events: WeightedEvent[] = [];
  const team2Events: WeightedEvent[] = [];

  if (mode === "combined" || mode === "kills") {
    for (const k of kills) {
      const entry = { time: k.match_time, weight: killWeight };
      if (k.attacker_team === team1Name) {
        team1Events.push(entry);
      } else {
        team2Events.push(entry);
      }
    }
  }

  if (mode === "combined" || mode === "ults") {
    for (const u of ultStarts) {
      const entry = { time: u.match_time, weight: ultWeight };
      if (u.player_team === team1Name) {
        team1Events.push(entry);
      } else {
        team2Events.push(entry);
      }
    }
  }

  const t1Values = gaussianKDE(team1Events, matchStart, matchEnd);
  const t2Values = gaussianKDE(team2Events, matchStart, matchEnd);

  // Normalize peak to 1.0 across both teams
  let maxVal = 0;
  for (let i = 0; i < t1Values.length; i++) {
    maxVal = Math.max(maxVal, t1Values[i], t2Values[i]);
  }
  if (maxVal === 0) maxVal = 1;

  const series: TempoDataPoint[] = [];
  for (let i = 0; i < t1Values.length; i++) {
    series.push({
      time: matchStart + i * SAMPLE_INTERVAL,
      team1: t1Values[i] / maxVal,
      team2: t2Values[i] / maxVal,
    });
  }

  return series;
}

export function fightsToBoundaries(fights: Fight[]): FightBoundary[] {
  return fights.map((f, i) => ({
    start: f.start,
    end: f.end,
    fightNumber: i + 1,
  }));
}

export function tempoPointsToSvgPath(
  points: { x: number; y: number }[]
): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;
  }

  const alpha = 0.5; // Catmull-Rom tension

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

export async function getTempoChartData(
  mapId: number
): Promise<TempoChartData | null> {
  const [kills, ultStarts, matchStart, matchEnd, mercyRezzes] =
    await Promise.all([
      prisma.kill.findMany({ where: { MapDataId: mapId } }),
      prisma.ultimateStart.findMany({ where: { MapDataId: mapId } }),
      prisma.matchStart.findFirst({ where: { MapDataId: mapId } }),
      prisma.matchEnd.findFirst({ where: { MapDataId: mapId } }),
      prisma.mercyRez.findMany({ where: { MapDataId: mapId } }),
    ]);

  if (!matchStart || !matchEnd) return null;
  if (kills.length < 3) return null;

  const team1Name = matchStart.team_1_name;
  const team2Name = matchStart.team_2_name;
  const startTime = matchStart.match_time;
  const endTime = matchEnd.match_time;

  const allKillEvents = [
    ...kills,
    ...mercyRezzes.map(mercyRezToKillEvent),
  ].sort((a, b) => a.match_time - b.match_time);
  const fights = groupEventsIntoFights(allKillEvents);
  const fightBoundaries = fightsToBoundaries(fights);

  const combinedSeries = computeTempoSeries(
    kills,
    ultStarts,
    team1Name,
    startTime,
    endTime,
    "combined"
  );
  const killsSeries = computeTempoSeries(
    kills,
    ultStarts,
    team1Name,
    startTime,
    endTime,
    "kills"
  );
  const ultsSeries = computeTempoSeries(
    kills,
    ultStarts,
    team1Name,
    startTime,
    endTime,
    "ults"
  );

  const ultPins: UltPin[] = ultStarts.map((u) => ({
    time: u.match_time,
    hero: u.player_hero,
    playerName: u.player_name,
    team: u.player_team === team1Name ? "team1" : "team2",
  }));

  const killPins: KillPin[] = kills.map((k) => ({
    time: k.match_time,
    hero: k.attacker_hero,
    playerName: k.attacker_name,
    victimHero: k.victim_hero,
    victimName: k.victim_name,
    team: k.attacker_team === team1Name ? "team1" : "team2",
  }));

  return {
    combinedSeries,
    killsSeries,
    ultsSeries,
    ultPins,
    killPins,
    fightBoundaries,
    matchStartTime: startTime,
    matchEndTime: endTime,
    team1Name,
    team2Name,
  };
}
