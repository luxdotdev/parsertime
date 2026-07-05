/**
 * The local fuzzy matcher behind Find. Pure functions, no DOM, no React —
 * fast enough for the main thread at Sightline's data sizes (hundreds of
 * documents) and portable to a WebWorker if that ever changes.
 *
 * Matching is token-based: every query token must land somewhere in the
 * document's texts (label + aliases), with quality tiers per token:
 * exact > prefix > substring > one-typo > subsequence. Documents matched by
 * only *some* tokens aren't discarded — the partial-match info feeds
 * combined-query resolution ("faze trends" = entity token + page tokens).
 */

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[\s/,+.·-]+/)
    .filter(Boolean);
}

/** True when edit distance ≤ 1 counting adjacent transposition as one edit
 * (Damerau). Covers the "deply" → "deploy" and "wesbite" → "website" class. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;

  if (la === lb) {
    // One substitution, or one adjacent transposition.
    let i = 0;
    while (i < la && a[i] === b[i]) i++;
    if (i === la) return true;
    if (a.slice(i + 1) === b.slice(i + 1)) return true; // substitution
    return (
      a[i] === b[i + 1] &&
      a[i + 1] === b[i] &&
      a.slice(i + 2) === b.slice(i + 2)
    ); // transposition
  }

  // One insertion/deletion: align the shorter into the longer.
  const [short, long] = la < lb ? [a, b] : [b, a];
  let i = 0;
  while (i < short.length && short[i] === long[i]) i++;
  return short.slice(i) === long.slice(i + 1);
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++;
  }
  return i === needle.length;
}

/** Best score for one query token against one document token, or 0. */
function scoreTokenPair(qt: string, dt: string): number {
  if (dt === qt) return 100;
  if (dt.startsWith(qt)) {
    // Longer coverage of the target token ranks higher ("dash" beats "da").
    return 70 + Math.round((qt.length / dt.length) * 20);
  }
  if (qt.length >= 3 && dt.includes(qt)) return 55;
  if (qt.length >= 4 && Math.abs(dt.length - qt.length) <= 1) {
    if (withinOneEdit(qt, dt)) return 48;
    // Prefix with one typo ("deply" matching "deployments").
    if (dt.length > qt.length && withinOneEdit(qt, dt.slice(0, qt.length))) {
      return 42;
    }
  }
  if (qt.length >= 3 && isSubsequence(qt, dt)) return 30;
  return 0;
}

export type TokenMatch = {
  /** Sum of per-token scores for the tokens that matched. */
  score: number;
  /** Indexes (into the query token array) that matched this document. */
  matched: number[];
};

/**
 * Matches query tokens against a document's texts. Returns per-token results
 * so callers can decide between full matches (every token landed) and
 * partial matches (combined-query candidates).
 */
export function matchTokens(
  queryTokens: string[],
  texts: readonly string[]
): TokenMatch {
  const docTokens: string[] = [];
  for (const text of texts) docTokens.push(...tokenize(text));

  let score = 0;
  const matched: number[] = [];
  for (let i = 0; i < queryTokens.length; i++) {
    let best = 0;
    for (const dt of docTokens) {
      const s = scoreTokenPair(queryTokens[i], dt);
      if (s > best) best = s;
    }
    if (best > 0) {
      score += best;
      matched.push(i);
    }
  }

  if (matched.length > 0) {
    // Compactness bonus: fewer document tokens means the query described
    // more of the document ("Dashboard" over "Data Labeling" for "da").
    score += Math.max(0, 12 - docTokens.length * 2);

    // Whole-label prefix bonus: the query as typed leads the primary text.
    const primary = normalize(texts[0] ?? "");
    const joined = queryTokens.join(" ");
    if (primary.startsWith(joined)) score += 25;
  }

  return { score, matched };
}

/** Convenience: full-match score, or null when any token missed. */
export function matchAll(
  queryTokens: string[],
  texts: readonly string[]
): number | null {
  const { score, matched } = matchTokens(queryTokens, texts);
  return matched.length === queryTokens.length ? score : null;
}
