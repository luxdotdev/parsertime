"use server";

import { canViewTeam, getCurrentUser, isAdminUser } from "@/lib/auth";
import { queryBuilder } from "@/lib/flags";
import prisma from "@/lib/prisma";
import { getDataset, getFilter } from "@/lib/query-builder/registry";
import {
  buildPlan,
  renderDisplaySql,
  toExecutable,
} from "@/lib/query-builder/plan";
import {
  querySpecSchema,
  type DatasetId,
  type QueryResult,
  type QuerySpec,
  type ResultRow,
  type RunQueryResponse,
  type SavedQuerySummary,
  type ViewableTeam,
} from "@/lib/query-builder/types";

async function requireAccess(
  teamId: number
): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }
  | { ok: false; error: string }
> {
  const enabled = await queryBuilder();
  if (!enabled) return { ok: false, error: "This feature is not available." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  if (!(await canViewTeam(teamId, user))) {
    return { ok: false, error: "You do not have access to this team." };
  }
  return { ok: true, user };
}

/** Teams the current user may read: every team for admins, owned/managed/member otherwise. */
export async function getViewableTeams(): Promise<ViewableTeam[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const teams = await prisma.team.findMany({
    where: isAdminUser(user)
      ? {}
      : {
          OR: [
            { ownerId: user.id },
            { users: { some: { id: user.id } } },
            { managers: { some: { userId: user.id } } },
          ],
        },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return teams;
}

/** Resolve the scrim ids in scope for a team, honoring the time window. */
async function resolveScrimIds(
  teamId: number,
  timeScope: QuerySpec["timeScope"]
): Promise<number[]> {
  const where: { teamId: number; date?: { gte?: Date; lte?: Date } } = {
    teamId,
  };
  if (timeScope.kind === "dateRange") {
    where.date = {};
    if (timeScope.from) where.date.gte = new Date(timeScope.from);
    if (timeScope.to) where.date.lte = new Date(timeScope.to);
  }

  const scrims = await prisma.scrim.findMany({
    where,
    select: { id: true },
    orderBy: { date: "desc" },
    ...(timeScope.kind === "lastN" && timeScope.lastN
      ? { take: timeScope.lastN }
      : {}),
  });
  return scrims.map((s) => s.id);
}

/** Distinct, team-scoped values for a dynamic filter (heroes, players, maps...). */
export async function getFieldOptions(
  teamId: number,
  dataset: DatasetId,
  filterId: string
): Promise<string[]> {
  const access = await requireAccess(teamId);
  if (!access.ok) return [];

  const filter = getFilter(dataset, filterId);
  if (!filter?.optionsColumn) return [];

  const scrimIds = await resolveScrimIds(teamId, { kind: "all" });
  if (scrimIds.length === 0) return [];

  const table = getDataset(dataset).table;
  const placeholders = scrimIds.map((_, i) => `$${i + 1}`).join(", ");
  const col = `"${filter.optionsColumn.replace(/"/g, '""')}"`;
  const sql = `SELECT DISTINCT ${col} AS value FROM "${table}" WHERE "scrimId" IN (${placeholders}) AND ${col} IS NOT NULL ORDER BY value ASC LIMIT 300`;

  try {
    const rows = await prisma.$queryRawUnsafe<{ value: string | null }[]>(
      sql,
      ...scrimIds
    );
    return rows
      .map((r) => r.value)
      .filter((v): v is string => v !== null && v !== "");
  } catch {
    return [];
  }
}

export async function runQuery(rawSpec: unknown): Promise<RunQueryResponse> {
  const started = Date.now();

  const parsed = querySpecSchema.safeParse(rawSpec);
  if (!parsed.success) {
    return { ok: false, error: "That query is not valid yet." };
  }
  const spec = parsed.data;

  const access = await requireAccess(spec.teamId);
  if (!access.ok) return { ok: false, error: access.error };

  const team = await prisma.team.findUnique({
    where: { id: spec.teamId },
    select: { name: true },
  });
  if (!team) return { ok: false, error: "Team not found." };

  let plan;
  try {
    plan = buildPlan(spec);
  } catch {
    return { ok: false, error: "That query is not valid yet." };
  }

  const scrimIds = await resolveScrimIds(spec.teamId, spec.timeScope);
  const { sql, params } = toExecutable(plan, scrimIds);

  let rawRows: Record<string, unknown>[];
  try {
    rawRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      sql,
      ...params
    );
  } catch {
    return {
      ok: false,
      error: "The query could not be run. Try adjusting it.",
    };
  }

  const rows: ResultRow[] = rawRows.map((raw) => {
    const row: ResultRow = {};
    for (const col of plan.columns) {
      const value = raw[col.key];
      if (value === null || value === undefined) {
        row[col.key] = null;
      } else if (col.kind === "metric") {
        row[col.key] = typeof value === "number" ? value : Number(value);
      } else {
        row[col.key] = String(value as string | number);
      }
    }
    return row;
  });

  const result: QueryResult = {
    columns: plan.columns,
    rows,
    sql: renderDisplaySql(plan, {
      teamName: team.name,
      scrimCount: scrimIds.length,
    }),
    tables: plan.tables,
    meta: {
      rowCount: rows.length,
      teamId: spec.teamId,
      teamName: team.name,
      scrimCount: scrimIds.length,
      durationMs: Date.now() - started,
      truncated: rows.length >= plan.limit,
    },
  };
  return { ok: true, result };
}

// --- Saved queries ----------------------------------------------------------
// Backed by the SavedQuery model. Reads degrade gracefully if the migration
// has not been applied yet, so the page still renders during setup.

export async function listSavedQueries(): Promise<SavedQuerySummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    const saved = await prisma.savedQuery.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return saved.flatMap((s) => {
      const parsed = querySpecSchema.safeParse(s.spec);
      if (!parsed.success) return [];
      return [
        {
          id: s.id,
          name: s.name,
          dataset: parsed.data.dataset,
          teamId: parsed.data.teamId,
          spec: parsed.data,
          updatedAt: s.updatedAt.toISOString(),
        },
      ];
    });
  } catch {
    return [];
  }
}

export async function saveQuery(
  name: string,
  rawSpec: unknown
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const parsed = querySpecSchema.safeParse(rawSpec);
  if (!parsed.success) return { ok: false, error: "That query is not valid." };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Give the query a name." };

  if (!(await canViewTeam(parsed.data.teamId, user))) {
    return { ok: false, error: "You do not have access to this team." };
  }

  try {
    await prisma.savedQuery.create({
      data: {
        userId: user.id,
        name: trimmed.slice(0, 120),
        teamId: parsed.data.teamId,
        spec: parsed.data,
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Saved queries are not set up yet." };
  }
}

export async function deleteSavedQuery(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  try {
    await prisma.savedQuery.deleteMany({ where: { id, userId: user.id } });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
