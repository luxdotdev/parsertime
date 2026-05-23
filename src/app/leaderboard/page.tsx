import {
  LeaderboardHub,
  type MetricStats,
} from "@/components/leaderboard/leaderboard-hub";
import { getInitialTsrLeaderboard } from "@/lib/tsr/leaderboard";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leaderboardPage.hub.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LeaderboardHubPage() {
  const [tsr, t, formatter] = await Promise.all([
    getInitialTsrLeaderboard(),
    getTranslations("leaderboardPage.hub"),
    getFormatter(),
  ]);

  const statsById: Partial<Record<"csr" | "tsr", MetricStats>> = {
    csr: {
      ribbon: [
        {
          label: t("stats.perHero"),
          value: t("stats.topCount", { count: 50 }),
        },
        {
          label: t("stats.minSample"),
          value: t("stats.mapCount", { count: 10 }),
        },
        {
          label: t("stats.scale"),
          value: t("stats.scaleValue", { max: 5000 }),
        },
      ],
      status: t("stats.csrStatus"),
    },
    tsr: {
      ribbon: [
        {
          label: t("stats.active"),
          value: formatter.number(tsr.meta.totalActive),
        },
        {
          label: t("stats.trackedPlayers"),
          value: formatter.number(tsr.meta.totalAll),
        },
        {
          label: t("stats.trackedMatches"),
          value: formatter.number(tsr.meta.totalTrackedMatches),
        },
        {
          label: t("stats.topRating"),
          value: tsr.meta.topRating
            ? formatter.number(tsr.meta.topRating)
            : "—",
        },
      ],
      status:
        tsr.meta.totalAll > 0
          ? t("stats.lastRecompute", {
              when: formatRecompute(tsr.meta.computedAt, t),
            })
          : t("stats.awaitingSeed"),
    },
  };

  return <LeaderboardHub statsById={statsById} />;
}

function formatRecompute(
  date: Date | null,
  t: Awaited<ReturnType<typeof getTranslations>>
): string {
  if (!date) return "—";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return t("relative.justNow");
  if (minutes < 60) return t("relative.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("relative.hoursAgo", { count: hours });
  return t("relative.daysAgo", { count: Math.floor(hours / 24) });
}
