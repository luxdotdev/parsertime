import {
  LeaderboardHub,
  type MetricStats,
} from "@/components/leaderboard/leaderboard-hub";
import { getInitialTsrLeaderboard } from "@/lib/tsr/leaderboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboards | Parsertime",
  description:
    "Two ways to read player skill in Overwatch 2: per-hero composite rating and tournament-grounded Elo.",
};

export default async function LeaderboardHubPage() {
  const tsr = await getInitialTsrLeaderboard();

  const statsById: Partial<Record<"csr" | "tsr", MetricStats>> = {
    csr: {
      ribbon: [
        { label: "Per hero", value: "Top 50" },
        { label: "Min sample", value: "10 maps" },
        { label: "Scale", value: "1 – 5000" },
      ],
      status: "Updates as scrims upload.",
    },
    tsr: {
      ribbon: [
        { label: "Active", value: tsr.meta.totalActive.toLocaleString() },
        {
          label: "Tracked players",
          value: tsr.meta.totalAll.toLocaleString(),
        },
        {
          label: "Tracked matches",
          value: tsr.meta.totalTrackedMatches.toLocaleString(),
        },
        {
          label: "Top rating",
          value: tsr.meta.topRating
            ? tsr.meta.topRating.toLocaleString()
            : "—",
        },
      ],
      status:
        tsr.meta.totalAll > 0
          ? `Last full recompute ${formatRecompute(tsr.meta.computedAt)}.`
          : "Awaiting initial seed.",
    },
  };

  return <LeaderboardHub statsById={statsById} />;
}

function formatRecompute(date: Date | null): string {
  if (!date) return "—";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
