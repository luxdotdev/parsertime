// Pure, dependency-free. Safe to import from anywhere (client or server).

const SEGMENT_ID_PATTERNS = [
  /^\d+$/, // numeric ids
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // uuid
  /^c[a-z0-9]{20,}$/i, // cuid / cuid2 (24-25 chars; 20+ avoids matching real path words)
  /^[0-9a-f]{24,}$/i, // long hex (mongo-style / tokens)
];

function isIdSegment(segment: string): boolean {
  return SEGMENT_ID_PATTERNS.some((re) => re.test(segment));
}

/**
 * Collapse a concrete request path into a route template:
 * - drops the query string entirely (never store tokens)
 * - replaces id-like segments with `[id]`
 * - strips trailing slash; empty path becomes "/"
 */
export function normalizePath(rawPath: string): string {
  const withoutQuery = rawPath.split("?")[0] ?? "";
  if (withoutQuery === "" || withoutQuery === "/") return "/";

  const template = withoutQuery
    .split("/")
    .map((segment) => (isIdSegment(segment) ? "[id]" : segment))
    .join("/");

  return template.endsWith("/") ? template.slice(0, -1) : template;
}
