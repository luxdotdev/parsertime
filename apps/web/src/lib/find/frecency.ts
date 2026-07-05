/**
 * On-device frecency (frequency + recency) for Find. Every intentional visit
 * to a destination is recorded locally — nothing leaves the browser — and
 * the scores rank the pre-query suggestions and boost matching results.
 *
 * An "intentional" visit is a navigation the user settled on: either a
 * selection made inside Find itself, or a page the user stayed on for 30
 * seconds without navigating away (so pass-through hops don't count).
 */

const STORAGE_KEY = "sightline.find.frecency.v1";
const MAX_ENTRIES = 120;
const SAMPLED_VISITS = 10;
/** Re-visits inside this window don't re-record (guards refresh loops). */
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

type FrecencyEntry = {
  /** Total lifetime visit count. */
  count: number;
  /** Most recent visit timestamps (epoch ms), newest first, capped. */
  visits: number[];
};

export type FrecencyTable = Record<string, FrecencyEntry>;

function hasStorage(): boolean {
  try {
    return typeof globalThis.localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function loadFrecency(): FrecencyTable {
  if (!hasStorage()) return {};
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as FrecencyTable;
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveFrecency(table: FrecencyTable): void {
  if (!hasStorage()) return;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(table));
  } catch {
    // Quota or privacy mode: frecency silently degrades to session-less.
  }
}

/** Mozilla-style bucketed weights: recent visits dominate, old ones linger. */
function visitWeight(ageMs: number): number {
  const hour = 60 * 60 * 1000;
  if (ageMs < hour) return 100;
  if (ageMs < 6 * hour) return 70;
  if (ageMs < 24 * hour) return 50;
  if (ageMs < 4 * 24 * hour) return 30;
  if (ageMs < 14 * 24 * hour) return 10;
  return 5;
}

export function frecencyScore(entry: FrecencyEntry, now: number): number {
  if (entry.visits.length === 0) return 0;
  const sampled = entry.visits.slice(0, SAMPLED_VISITS);
  const sum = sampled.reduce((acc, t) => acc + visitWeight(now - t), 0);
  return (sum / sampled.length) * Math.min(entry.count, 40);
}

export function recordVisit(key: string, now = Date.now()): void {
  const table = loadFrecency();
  const entry = table[key] ?? { count: 0, visits: [] };

  if (entry.visits[0] !== undefined && now - entry.visits[0] < DEDUPE_WINDOW_MS) {
    return;
  }

  entry.count += 1;
  entry.visits = [now, ...entry.visits].slice(0, SAMPLED_VISITS);
  table[key] = entry;

  // Cap the table: evict the lowest-scoring entries.
  const keys = Object.keys(table);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => frecencyScore(table[a], now) - frecencyScore(table[b], now))
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete table[k]);
  }

  saveFrecency(table);
}

/** Highest-scoring keys first. */
export function topFrecent(
  table: FrecencyTable,
  limit: number,
  now = Date.now()
): string[] {
  return Object.entries(table)
    .map(([key, entry]) => ({ key, score: frecencyScore(entry, now) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((e) => e.key);
}

/**
 * A bounded ranking boost (0–30) so frequently-used destinations win ties in
 * search results without letting frecency override match quality.
 */
export function frecencyBoost(
  table: FrecencyTable,
  key: string,
  now = Date.now()
): number {
  const entry = table[key];
  if (!entry) return 0;
  const score = frecencyScore(entry, now);
  return Math.min(30, Math.round(score / 40));
}
