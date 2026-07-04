import {
  LeaderboardHub,
  type MetricStats,
} from "@/components/leaderboard/leaderboard-hub";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import { getInitialTsrLeaderboard } from "@/lib/tsr/leaderboard";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("leaderboardPage.hub.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

// Static shell: LeaderboardHub renders the whole page frame (header included),
// so the shell is a single boundary whose fallback mirrors the hub's own
// layout — real header text via the cookie-free translator, skeleton metric
// sections — replacing the old route loading.tsx.
export default function LeaderboardHubPage() {
  return (
    <Suspense fallback={<HubSkeleton />}>
      <LeaderboardHubContent />
    </Suspense>
  );
}

async function LeaderboardHubContent() {
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

// Mirrors LeaderboardHub's layout (container, header, two metric sections)
// so the streamed content replaces this in place with no jump.
function HubSkeleton() {
  const t = getStaticTranslations("leaderboardPage.hub");

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-sm leading-relaxed">
          {t("description")}
        </p>
      </header>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {["csr", "tsr"].map((k) => (
          <div
            key={k}
            className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
          >
            <div>
              <Skeleton className="h-2.5 w-32" />
              <Skeleton className="mt-3 h-8 w-48" />
              <Skeleton className="mt-3 h-3 w-28" />
              <Skeleton className="mt-6 h-9 w-36" />
            </div>

            <div className="space-y-6">
              <div className="border-border flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b pb-4">
                {["a", "b", "c"].map((j) => (
                  <div key={j} className="flex flex-col gap-1">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>

              <div>
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-1.5 h-4 w-3/4" />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Skeleton className="h-2.5 w-24" />
                  <div className="mt-2 space-y-1.5">
                    {["a", "b", "c"].map((j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
                <div>
                  <Skeleton className="h-2.5 w-24" />
                  <div className="mt-2 space-y-1.5">
                    {["a", "b"].map((j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
