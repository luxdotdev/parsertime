import type { UsageEnv } from "@prisma/client";

export type RawEventRow = {
  name: string;
  environment: UsageEnv;
  userId: string | null;
  teamId: number | null;
  path: string | null;
};

export type FeatureRollupRow = {
  environment: UsageEnv;
  day: string;
  name: string;
  totalEvents: number;
  uniqueUsers: number;
  uniqueTeams: number;
};

export type PageRollupRow = {
  environment: UsageEnv;
  day: string;
  path: string;
  views: number;
  uniqueUsers: number;
};

export type ActiveUserRow = {
  environment: UsageEnv;
  day: string;
  userId: string;
};

/** YYYY-MM-DD in UTC. */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function aggregateFeatureRollups(
  rows: RawEventRow[],
  day: string
): FeatureRollupRow[] {
  const map = new Map<
    string,
    { env: UsageEnv; name: string; total: number; users: Set<string>; teams: Set<number> }
  >();
  for (const row of rows) {
    const key = `${row.environment} ${row.name}`;
    let entry = map.get(key);
    if (!entry) {
      entry = { env: row.environment, name: row.name, total: 0, users: new Set(), teams: new Set() };
      map.set(key, entry);
    }
    entry.total += 1;
    if (row.userId) entry.users.add(row.userId);
    if (row.teamId != null) entry.teams.add(row.teamId);
  }
  return [...map.values()].map((e) => ({
    environment: e.env,
    day,
    name: e.name,
    totalEvents: e.total,
    uniqueUsers: e.users.size,
    uniqueTeams: e.teams.size,
  }));
}

export function aggregatePageRollups(
  rows: RawEventRow[],
  day: string
): PageRollupRow[] {
  const map = new Map<
    string,
    { env: UsageEnv; path: string; views: number; users: Set<string> }
  >();
  for (const row of rows) {
    if (row.name !== "page_view" || !row.path) continue;
    const key = `${row.environment} ${row.path}`;
    let entry = map.get(key);
    if (!entry) {
      entry = { env: row.environment, path: row.path, views: 0, users: new Set() };
      map.set(key, entry);
    }
    entry.views += 1;
    if (row.userId) entry.users.add(row.userId);
  }
  return [...map.values()].map((e) => ({
    environment: e.env,
    day,
    path: e.path,
    views: e.views,
    uniqueUsers: e.users.size,
  }));
}

export function aggregateActiveUsers(
  rows: RawEventRow[],
  day: string
): ActiveUserRow[] {
  const seen = new Set<string>();
  const result: ActiveUserRow[] = [];
  for (const row of rows) {
    if (!row.userId) continue;
    const key = `${row.environment} ${row.userId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ environment: row.environment, day, userId: row.userId });
  }
  return result;
}
