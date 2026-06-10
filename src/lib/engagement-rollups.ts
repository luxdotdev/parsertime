import { round } from "@/lib/utils";

export type EngagementOutcome = {
  winner: string | null;
  zoneName: string | null;
};

export type EngagementSummary = {
  total: number;
  won: number;
  lost: number;
  even: number;
  /** won / (won + lost) — null when no decisive engagements. */
  winratePercent: number | null;
  byZone: { zoneName: string; won: number; lost: number; even: number }[];
};

export function summarizeEngagements(
  engagements: EngagementOutcome[],
  ourTeam: string
): EngagementSummary {
  let won = 0;
  let lost = 0;
  let even = 0;
  const zones = new Map<string, { won: number; lost: number; even: number }>();

  for (const e of engagements) {
    const bucket =
      e.winner === null ? "even" : e.winner === ourTeam ? "won" : "lost";
    if (bucket === "won") won++;
    else if (bucket === "lost") lost++;
    else even++;

    if (e.zoneName) {
      const z = zones.get(e.zoneName) ?? { won: 0, lost: 0, even: 0 };
      z[bucket]++;
      zones.set(e.zoneName, z);
    }
  }

  return {
    total: engagements.length,
    won,
    lost,
    even,
    winratePercent: won + lost > 0 ? round((won / (won + lost)) * 100) : null,
    byZone: Array.from(zones, ([zoneName, counts]) => ({
      zoneName,
      ...counts,
    })),
  };
}

export function mergeEngagementSummaries(
  summaries: EngagementSummary[]
): EngagementSummary {
  const zones = new Map<string, { won: number; lost: number; even: number }>();
  let total = 0;
  let won = 0;
  let lost = 0;
  let even = 0;
  for (const s of summaries) {
    total += s.total;
    won += s.won;
    lost += s.lost;
    even += s.even;
    for (const z of s.byZone) {
      const acc = zones.get(z.zoneName) ?? { won: 0, lost: 0, even: 0 };
      acc.won += z.won;
      acc.lost += z.lost;
      acc.even += z.even;
      zones.set(z.zoneName, acc);
    }
  }
  return {
    total,
    won,
    lost,
    even,
    winratePercent: won + lost > 0 ? round((won / (won + lost)) * 100) : null,
    byZone: Array.from(zones, ([zoneName, counts]) => ({
      zoneName,
      ...counts,
    })),
  };
}
