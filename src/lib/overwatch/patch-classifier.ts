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

const HOTFIX_RE = /\b(?:bug fix )?hotfix patch\b/i;
const SEASON_RE = /season\s+(\d+):\s*([^\n–—-]+?)\s+patch notes/i;

export function classifyPatch({ rawTitle, body }: ClassifyInput): ClassifyResult {
  const haystack = `${rawTitle}\n${body}`;

  // 1. Hotfix wins outright — these preserve replay codes.
  if (HOTFIX_RE.test(haystack)) {
    return { type: "HOTFIX", name: rawTitle, needsReview: true };
  }

  // 2. Season launches embed "Season N: Codename Patch Notes" in the body.
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

  // 3. Everything else is a mid-cycle balance patch — the default between seasons.
  return { type: "MID_SEASON", name: rawTitle, needsReview: true };
}
