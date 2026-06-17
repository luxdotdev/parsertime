import { tool } from "ai";
import { z } from "zod";
import {
  buildCatalogIndex,
  buildDatasetCatalog,
} from "@/lib/query-builder/catalog";
import {
  getFieldOptions,
  runQuery as runQueryAction,
} from "@/lib/query-builder/server";
import { DATASETS } from "@/lib/query-builder/types";
import {
  assertTeamAccess,
  capRowsForModel,
  validateQuerySpec,
} from "@/lib/ai/query-tool-helpers";

export function buildQueryTools(opts: { allowedTeamIds: Set<number> }) {
  const { allowedTeamIds } = opts;

  return {
    describeQueryCatalog: tool({
      description:
        "Discover what the ad-hoc query builder can read. Call with no dataset to list every dataset (id + what one row represents). Call with a dataset to get its metrics, dimensions, and filters. Optionally pass teamId + resolveOptionsFor (a filter id) to resolve the real, team-scoped values for a dynamic filter (heroes/players/maps). Always call this BEFORE runQuery so you use valid ids.",
      inputSchema: z.object({
        dataset: z
          .enum(DATASETS)
          .optional()
          .describe("Dataset id to inspect. Omit to list all datasets."),
        teamId: z
          .number()
          .optional()
          .describe(
            "Team id, required only when resolving dynamic filter options."
          ),
        resolveOptionsFor: z
          .string()
          .optional()
          .describe(
            "A filter id whose dynamic, team-scoped values to resolve. Requires dataset and teamId."
          ),
      }),
      execute: async ({ dataset, teamId, resolveOptionsFor }) => {
        if (!dataset) {
          return { datasets: buildCatalogIndex() };
        }
        const catalog = buildDatasetCatalog(dataset);
        if (resolveOptionsFor && teamId === undefined) {
          return {
            catalog,
            error:
              "resolveOptionsFor requires teamId to resolve team-scoped values.",
          };
        }
        if (resolveOptionsFor && teamId !== undefined) {
          assertTeamAccess(allowedTeamIds, teamId);
          const options = await getFieldOptions(
            teamId,
            dataset,
            resolveOptionsFor
          );
          return {
            catalog,
            resolvedOptions: { filter: resolveOptionsFor, options },
          };
        }
        return { catalog };
      },
    }),

    runQuery: tool({
      description:
        "Run an ad-hoc, read-only query against a team's scrim data using a QuerySpec built from describeQueryCatalog. Returns up to 50 rows plus the total row count and the compiled SQL. Use this only for analyses the dedicated tools don't already cover.",
      inputSchema: z.object({
        spec: z
          .object({
            dataset: z.enum(DATASETS),
            teamId: z.number(),
            metrics: z
              .array(z.object({ metric: z.string(), agg: z.string() }))
              .describe(
                "1-8 metrics; agg is one of sum, avg, max, min, count, per10, ratio."
              ),
            dimensions: z.array(z.string()).optional(),
            filters: z
              .array(
                z.object({
                  field: z.string(),
                  op: z.string(),
                  value: z.union([
                    z.string(),
                    z.number(),
                    z.array(z.union([z.string(), z.number()])),
                  ]),
                })
              )
              .optional(),
            timeScope: z
              .object({
                kind: z.enum(["all", "lastN", "dateRange"]),
                lastN: z.number().optional(),
                from: z.string().optional(),
                to: z.string().optional(),
              })
              .optional(),
            sort: z
              .object({ key: z.string(), dir: z.enum(["asc", "desc"]) })
              .nullish(),
            limit: z.number().nullish(),
          })
          .describe("The QuerySpec describing the query."),
      }),
      execute: async ({ spec }) => {
        const validation = validateQuerySpec(spec);
        if (!validation.ok) {
          return {
            error: `The query spec is not valid. Fix these and try again: ${validation.issues.join(
              "; "
            )}`,
          };
        }
        assertTeamAccess(allowedTeamIds, validation.spec.teamId);
        const response = await runQueryAction(validation.spec);
        if (!response.ok) {
          return { error: response.error };
        }
        return capRowsForModel(response.result);
      },
    }),
  };
}
