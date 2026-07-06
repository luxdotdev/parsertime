import { frecencyBoost, type FrecencyTable } from "@/lib/find/frecency";
import { matchAll, matchTokens, tokenize } from "@/lib/find/matcher";
import type { FindActionDef } from "@/lib/find/schema";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";

/**
 * The ranking core of Find: pure, synchronous, no React. The dialog builds
 * localized documents (pages from the nav schema, entities from the index,
 * actions), and this module scores them — including rule-based combined
 * queries ("faze trends" → an entity token scoping a page token), which is
 * the local, no-LLM stand-in for a navigation assistant.
 */

export type FindResultKind =
  | "page"
  | "scoped-page"
  | "action"
  | "team"
  | "player"
  | "scrim";

export type FindResult = {
  /** Stable identity across result sets — merge and frecency key off it. */
  key: string;
  kind: FindResultKind;
  label: string;
  /** Disambiguation trail rendered right-aligned in the metadata layer,
   * e.g. ["Stats"] for a grouped page or ["Scrim", "Jun 28"]. */
  meta: string[];
  icon?: LucideIcon;
  href?: Route;
  external?: boolean;
  actionId?: FindActionDef["id"];
  score: number;
};

export type FindDoc = {
  key: string;
  kind: FindResultKind;
  /** Localized label first, then aliases — everything matchable. */
  texts: string[];
  /** The result payload emitted when this doc matches on its own. */
  result: Omit<FindResult, "score">;
  /** Entity docs: the values combined queries scope pages with. */
  teamId?: number;
  playerName?: string;
  /** Page docs: scoped-variant builders (from the nav schema). */
  teamHref?: (teamId: number) => Route;
  playerHref?: (playerName: string) => Route;
};

const KIND_WEIGHT: Record<FindResultKind, number> = {
  page: 20,
  "scoped-page": 20,
  action: 12,
  team: 18,
  player: 8,
  scrim: 10,
};

const COMBINE_BONUS = 40;

export function searchDocs(
  query: string,
  docs: readonly FindDoc[],
  frecency: FrecencyTable,
  limit = 8,
  now = Date.now()
): FindResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results: FindResult[] = [];

  for (const doc of docs) {
    const score = matchAll(tokens, doc.texts);
    if (score === null) continue;
    results.push({
      ...doc.result,
      score:
        score + KIND_WEIGHT[doc.kind] + frecencyBoost(frecency, doc.key, now),
    });
  }

  if (tokens.length >= 2) {
    results.push(...combinedResults(tokens, docs, frecency, now));
  }

  results.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const deduped: FindResult[] = [];
  for (const r of results) {
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    deduped.push(r);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

/**
 * Combined queries: an entity (team/player) claims some tokens, a scopable
 * page claims all the rest, and the pair resolves to the page's scoped URL.
 * Only emitted when neither half matches the full query alone, so combined
 * rows appear exactly when they're the best explanation of the query.
 */
function combinedResults(
  tokens: string[],
  docs: readonly FindDoc[],
  frecency: FrecencyTable,
  now: number
): FindResult[] {
  const entityDocs = docs.filter(
    (d) =>
      (d.kind === "team" && d.teamId !== undefined) ||
      (d.kind === "player" && d.playerName !== undefined)
  );
  const pageDocs = docs.filter(
    (d) => d.kind === "page" && (d.teamHref ?? d.playerHref) !== undefined
  );
  if (entityDocs.length === 0 || pageDocs.length === 0) return [];

  const out: FindResult[] = [];

  for (const entity of entityDocs) {
    const em = matchTokens(tokens, entity.texts);
    // Partial claim only: some tokens belong to the entity, some are left
    // over to describe a page.
    if (em.matched.length === 0 || em.matched.length === tokens.length) {
      continue;
    }
    const claimed = new Set(em.matched);
    const rest = tokens.filter((_, i) => !claimed.has(i));

    for (const page of pageDocs) {
      const scopedHref =
        entity.kind === "team" && page.teamHref && entity.teamId !== undefined
          ? page.teamHref(entity.teamId)
          : entity.kind === "player" && page.playerHref && entity.playerName
            ? page.playerHref(entity.playerName)
            : null;
      if (scopedHref === null) continue;

      const pageScore = matchAll(rest, page.texts);
      if (pageScore === null) continue;

      const key = `scoped:${page.key}:${entity.key}`;
      out.push({
        key,
        kind: "scoped-page",
        label: page.result.label,
        meta: [entity.result.label],
        icon: page.result.icon,
        href: scopedHref,
        score:
          em.score +
          pageScore +
          COMBINE_BONUS +
          KIND_WEIGHT["scoped-page"] +
          frecencyBoost(frecency, key, now),
      });
    }
  }

  return out;
}
