import {
  querySpecSchema,
  type QueryResult,
  type QuerySpec,
  type ResultRow,
} from "@/lib/query-builder/types";

/**
 * Pure helpers for the AI query tools. No prisma and no AI-SDK imports, so this
 * is unit-testable in isolation. The tools (query-tools.ts) compose these with
 * the runQuery/getFieldOptions server actions.
 */

export const QUERY_TOOL_NAMES = ["describeQueryCatalog", "runQuery"] as const;

/**
 * Max rows handed back to the model, to keep token cost and context bounded.
 * NOTE: this value is also stated as "50" in prose in two places — the runQuery
 * tool description (query-tools.ts) and queryToolsSystemPrompt (system-prompt.ts).
 * If you change it, update those strings too.
 */
export const MODEL_ROW_CAP = 50;

export type SpecValidation =
  | { ok: true; spec: QuerySpec }
  | { ok: false; issues: string[] };

/**
 * Validate a raw spec against the canonical querySpecSchema and, on failure,
 * surface readable issues so the model can self-correct. (The runQuery server
 * action returns deliberately vague errors; we add detail only at this layer.)
 */
export function validateQuerySpec(raw: unknown): SpecValidation {
  const parsed = querySpecSchema.safeParse(raw);
  if (parsed.success) return { ok: true, spec: parsed.data };
  const issues = parsed.error.issues.map(
    (i) => `${i.path.join(".") || "(root)"}: ${i.message}`
  );
  return { ok: false, issues };
}

export function assertTeamAccess(
  allowedTeamIds: Set<number>,
  teamId: number
): void {
  if (!allowedTeamIds.has(teamId)) {
    throw new Error("You don't have access to this team.");
  }
}

export type CappedResult = {
  columns: QueryResult["columns"];
  rows: ResultRow[];
  meta: QueryResult["meta"];
  sql: string;
  tables: string[];
  returnedRows: number;
  /** true when rows were dropped to fit MODEL_ROW_CAP */
  truncatedForModel: boolean;
};

export function capRowsForModel(
  result: QueryResult,
  max: number = MODEL_ROW_CAP
): CappedResult {
  const rows = result.rows.slice(0, max);
  return {
    columns: result.columns,
    rows,
    meta: result.meta,
    sql: result.sql,
    tables: result.tables,
    returnedRows: rows.length,
    truncatedForModel: result.rows.length > rows.length,
  };
}
