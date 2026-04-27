import { FaceitTier, TsrRegion } from "@prisma/client";

// OW2 standard play is 5v5. Reject mini-format events (1v1/2v2/3v3 duels,
// brawl learnings) — they run under the literal "faceit" organizer and would
// skew Elo wildly if mixed into the 5v5 tournament population.
const NON_TOURNAMENT_FORMAT_PATTERN =
  /\b1v1\b|\b2v2\b|\b3v3\b|brawl vs brawl|\belimination\b|mini-poke|knight & squire|trial event/;

export function classifyTier(name: string | null | undefined): FaceitTier {
  if (!name) return FaceitTier.UNCLASSIFIED;
  const n = name.toLowerCase();

  if (NON_TOURNAMENT_FORMAT_PATTERN.test(n)) return FaceitTier.UNCLASSIFIED;

  if (/owcs|champions series|\bowwc\b/.test(n)) {
    if (/open\s*qualif|\boq\b|\bqualifier\b/.test(n)) return FaceitTier.OPEN;
    return FaceitTier.OWCS;
  }
  if (n.includes("master")) return FaceitTier.MASTERS;
  if (n.includes("expert")) return FaceitTier.EXPERT;
  if (n.includes("advanced")) return FaceitTier.ADVANCED;
  if (/calling all heroes|\bcah\b/.test(n)) return FaceitTier.CAH;

  if (/open|qualif|cup|showdown/.test(n)) return FaceitTier.OPEN;

  return FaceitTier.UNCLASSIFIED;
}

export function inferRegion(
  name: string | null | undefined,
  faceitRegion?: string | null
): TsrRegion {
  const n = (name ?? "").toLowerCase();
  if (/\bna\b|north america|americas/.test(n)) return TsrRegion.NA;
  if (/\bemea\b|\beu\b|europe/.test(n)) return TsrRegion.EMEA;
  if (faceitRegion === "US") return TsrRegion.NA;
  if (faceitRegion === "EU") return TsrRegion.EMEA;
  return TsrRegion.OTHER;
}
