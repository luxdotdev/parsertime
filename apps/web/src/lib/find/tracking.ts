import {
  FIND_ONLY_PAGES,
  FOOTER_SCHEMA,
  NAV_SCHEMA,
  type NavLeaf,
} from "@/lib/find/schema";

/**
 * Resolves a pathname to the frecency key it should credit. Pages resolve to
 * their schema id; entity routes resolve to entity keys (`scrim:9`,
 * `player:Ana`, `team:3`) so the exact destinations a coach lives in float
 * to the top of Find's pre-query suggestions.
 */

const SCRIM_ROUTE = /^\/(\d+)\/scrim\/(\d+)(?:\/|$)/;
const TEAM_DETAIL_ROUTE = /^\/team\/(\d+)(?:\/|$)/;
const PLAYER_STATS_ROUTE =
  /^\/stats\/(?!hero(?:\/|$)|team(?:\/|$)|map(?:\/|$)|compare(?:\/|$))([^/]+)\/?$/;

function allLeaves(): NavLeaf[] {
  const leaves: NavLeaf[] = [];
  for (const section of NAV_SCHEMA) {
    for (const entry of section.entries) {
      if (entry.kind === "group") leaves.push(...entry.children);
      else leaves.push(entry);
    }
  }
  leaves.push(...FOOTER_SCHEMA, ...FIND_ONLY_PAGES);
  return leaves;
}

export function frecencyKeyForPathname(pathname: string): string | null {
  const leaves = allLeaves();

  // Exact static-href pages first, so `/settings/accounts` credits the
  // subpage rather than the broader `/settings` matcher.
  for (const leaf of leaves) {
    if (
      !leaf.external &&
      typeof leaf.href === "string" &&
      leaf.href === pathname
    ) {
      return leaf.id;
    }
  }

  const scrim = SCRIM_ROUTE.exec(pathname);
  if (scrim) return `scrim:${scrim[2]}`;

  const player = PLAYER_STATS_ROUTE.exec(pathname);
  if (player) return `player:${decodeURIComponent(player[1])}`;

  // Availability lives under /team/{id}/… but is a page, not the team entity.
  if (pathname.includes("/availability")) return "teams-availability";

  const team = TEAM_DETAIL_ROUTE.exec(pathname);
  if (team) return `team:${team[1]}`;

  for (const leaf of leaves) {
    if (leaf.isActive?.(pathname)) return leaf.id;
  }

  return null;
}
