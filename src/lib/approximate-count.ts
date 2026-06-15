import prisma from "@/lib/prisma";

/**
 * Approximate row counts for large tables using the planner's `reltuples`
 * estimate from `pg_class` — a system-catalog lookup that never touches the
 * table, versus `COUNT(*)` which sequentially scans every row.
 *
 * `reltuples` is kept current by autovacuum ANALYZE and is accurate to within a
 * fraction of a percent, which is more than enough for the "N tracked" figures
 * we display. Callers should apply their own floors for tables that may not have
 * been analyzed yet (a freshly created table reports `-1`, returned here as `0`).
 *
 * @param tables exact Postgres table names (case-sensitive, e.g. "PlayerStat")
 */
export async function getApproximateCounts<T extends string>(
  tables: readonly T[]
): Promise<Record<T, number>> {
  const rows = await prisma.$queryRaw<{ relname: string; estimate: bigint }[]>`
    SELECT c.relname, c.reltuples::bigint AS estimate
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = ANY(${tables as readonly string[]})
  `;

  const byName = new Map(rows.map((r) => [r.relname, Number(r.estimate)]));

  const result: Record<string, number> = {};
  for (const table of tables) {
    const estimate = byName.get(table) ?? 0;
    result[table] = estimate > 0 ? estimate : 0;
  }
  return result as Record<T, number>;
}
