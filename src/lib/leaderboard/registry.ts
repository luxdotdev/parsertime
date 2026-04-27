import type { Route } from "next";

export type LeaderboardMetric = {
  /** Stable ID. Used for keys and (future) URL slugs. */
  id: "csr" | "tsr";
  /** Short label. Goes in the subnav and card eyebrow. */
  shortLabel: string;
  /** Full sentence-case name. Page title and hub headline. */
  fullName: string;
  /** Where the leaderboard lives. */
  href: Route;
  /** One-sentence answer to "what does this rating ask?" */
  question: string;
  /** Two-line answer to "how is it derived?" */
  derivation: string;
  /** Three to five short bullets analysts use to decide which board to read. */
  strengths: string[];
  /** When this metric is the wrong tool. */
  caveats: string[];
};

export const LEADERBOARD_METRICS: LeaderboardMetric[] = [
  {
    id: "csr",
    shortLabel: "CSR",
    fullName: "Composite Skill Rating",
    href: "/leaderboard/csr",
    question:
      "How does this player perform statistically vs. peers on the same hero?",
    derivation:
      "Z-score across role-weighted per-10-minute stats from logged scrims. Scaled to 1 to 5000, mean 2500. Per hero, top 50.",
    strengths: [
      "Hero-specific, role-aware",
      "Reflects raw scrim execution",
      "Updates as soon as scrims upload",
    ],
    caveats: [
      "Doesn't account for opponent strength",
      "10 maps and 60 seconds per map minimum",
    ],
  },
  {
    id: "tsr",
    shortLabel: "TSR",
    fullName: "Tournament Skill Rating",
    href: "/leaderboard/tsr",
    question: "What level of competition can this player handle?",
    derivation:
      "Elo-style replay over FACEIT-hosted OW2 tournament results. Recency-weighted with a 365-day half-life, anchored at peak tier reached.",
    strengths: [
      "Grounded in head-to-head outcomes",
      "Comparable across regions and tiers",
      "Reflects current form",
    ],
    caveats: [
      "Only counts FACEIT-tracked tournaments",
      "Requires linked BattleTag",
    ],
  },
];
