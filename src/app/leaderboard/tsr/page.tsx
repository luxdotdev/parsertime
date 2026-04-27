import { TsrLeaderboard } from "@/components/leaderboard/tsr-leaderboard";
import { getTsrLeaderboard } from "@/lib/tsr/leaderboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournament Skill Rating | Parsertime",
  description:
    "Elo-style rating from FACEIT-hosted Overwatch 2 tournament results, recency weighted and anchored at peak tier reached.",
};

export default async function TsrLeaderboardPage() {
  const snapshot = await getTsrLeaderboard();
  return <TsrLeaderboard snapshot={snapshot} />;
}
