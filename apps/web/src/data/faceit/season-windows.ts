import type { FaceitSeasonWindow } from "./types";

export type SeasonSourceRow = {
  name: string;
  firstMatch: Date;
  lastMatch: Date;
  matchCount: number;
};

// League split names: "S8 NA Open Central - Regular Season"
const LEAGUE_SPLIT_PATTERN = /^S(\d+)\s/;
// Qualifier names: "FACEIT League Season 7 - Expert Qualifier (EMEA)"
const LEAGUE_QUALIFIER_PATTERN = /FACEIT League Season\s*(\d+)/i;

// Split prefix wins when both match ("S8 EMEA OWCS Relegation S9 - Season 9"
// belongs to the S8 window). Non-league events ("CAH Spring Season 2025",
// "WASB Cup") match neither pattern and contribute to no season.
export function parseFaceitSeasonNumber(name: string): number | null {
  const match =
    LEAGUE_SPLIT_PATTERN.exec(name) ?? LEAGUE_QUALIFIER_PATTERN.exec(name);
  const num = match?.[1];
  return num != null ? Number(num) : null;
}

export function buildSeasonWindows(
  rows: SeasonSourceRow[]
): FaceitSeasonWindow[] {
  const bySeason = new Map<number, FaceitSeasonWindow>();
  for (const row of rows) {
    const season = parseFaceitSeasonNumber(row.name);
    if (season == null) continue;
    const existing = bySeason.get(season);
    if (existing == null) {
      bySeason.set(season, {
        season,
        startDate: row.firstMatch,
        endDate: row.lastMatch,
        matchCount: row.matchCount,
      });
    } else {
      if (row.firstMatch < existing.startDate) {
        existing.startDate = row.firstMatch;
      }
      if (row.lastMatch > existing.endDate) {
        existing.endDate = row.lastMatch;
      }
      existing.matchCount += row.matchCount;
    }
  }
  return [...bySeason.values()].sort((a, b) => b.season - a.season);
}

export function resolveSeasonWindow(
  windows: FaceitSeasonWindow[],
  season: number | undefined
): FaceitSeasonWindow | null {
  if (season == null) return null;
  return windows.find((w) => w.season === season) ?? null;
}
