export type PatchTypeEnum = "SEASON" | "MID_SEASON" | "HOTFIX";

export type ClassifyInput = {
  rawTitle: string;
  body: string;
};

export type ClassifyResult = {
  type: PatchTypeEnum;
  name: string;
  needsReview: boolean;
};

// Real hotfix notes self-identify with the word "hotfix" in varied phrasing —
// "Hotfix Patch", "Balance Hotfix Update", "This hotfix includes…". Genuine
// bug-fix patches (replay codes wiped) and season launches never use the word,
// so matching the bare word gives clean separation.
const HOTFIX_RE = /\bhotfix\b/i;
const SEASON_RE = /season\s+(\d+):\s*([^\n]+?)\s+patch notes/i;

export function classifyPatch({ rawTitle, body }: ClassifyInput): ClassifyResult {
  const haystack = `${rawTitle}\n${body}`;

  // 1. Season launches embed "Season N: Codename Patch Notes" — a high-specificity
  //    signal, checked first so a passing "hotfix" mention can't override it.
  const season = haystack.match(SEASON_RE);
  if (season) {
    const number = season[1];
    const codename = season[2].trim();
    return {
      type: "SEASON",
      name: `Season ${number}: ${codename}`,
      needsReview: false,
    };
  }

  // 2. Hotfixes preserve replay codes and call themselves "hotfix" in the body.
  if (HOTFIX_RE.test(haystack)) {
    return { type: "HOTFIX", name: rawTitle, needsReview: true };
  }

  // 3. Everything else is a mid-cycle balance patch — the default between seasons.
  return { type: "MID_SEASON", name: rawTitle, needsReview: true };
}
