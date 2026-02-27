"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ScrimData } from "@/data/player-scouting-analytics-dto";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

type PlayerScrimOverviewProps = {
  scrimData: ScrimData | null;
};

export function PlayerScrimOverview({ scrimData }: PlayerScrimOverviewProps) {
  const t = useTranslations("scoutingPage.player.analytics.scrimOverview");
  const tNoData = useTranslations("scoutingPage.player.analytics");
  const tMethod = useTranslations("scoutingPage.player.analytics.scrimOverview.methodology");

  if (!scrimData) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Info className="text-muted-foreground h-8 w-8" aria-hidden="true" />
          <p className="text-muted-foreground max-w-md text-sm">
            {tNoData("noScrimData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { advancedMetrics, kdRatio, mapsPlayed } = scrimData;

  return (
    <section aria-labelledby="scrim-overview-heading">
      <Card>
        <CardHeader>
          <CardTitle id="scrim-overview-heading">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={t("mvpScore")}
              value={advancedMetrics.mvpScore.toFixed(1)}
              sentiment={advancedMetrics.mvpScore > 0 ? "positive" : advancedMetrics.mvpScore < -5 ? "negative" : "neutral"}
              methodology={tMethod("mvpScore")}
            />
            <MetricCard
              label={t("kdRatio")}
              value={kdRatio.toFixed(2)}
              sentiment={kdRatio >= 1.5 ? "positive" : kdRatio < 1.0 ? "negative" : "neutral"}
              methodology={tMethod("kdRatio")}
            />
            <MetricCard
              label={t("firstPickRate")}
              value={`${advancedMetrics.firstPickPercentage.toFixed(0)}%`}
              subtitle={t("firstPicks", { count: advancedMetrics.firstPickCount })}
              sentiment={advancedMetrics.firstPickPercentage > 25 ? "positive" : "neutral"}
              methodology={tMethod("firstPickRate")}
            />
            <MetricCard
              label={t("firstDeathRate")}
              value={`${advancedMetrics.firstDeathPercentage.toFixed(0)}%`}
              subtitle={t("firstDeaths", { count: advancedMetrics.firstDeathCount })}
              sentiment={advancedMetrics.firstDeathPercentage > 30 ? "negative" : advancedMetrics.firstDeathPercentage < 15 ? "positive" : "neutral"}
              methodology={tMethod("firstDeathRate")}
            />
            <MetricCard
              label={t("fightReversalRate")}
              value={`${advancedMetrics.fightReversalPercentage.toFixed(0)}%`}
              sentiment={advancedMetrics.fightReversalPercentage > 15 ? "positive" : "neutral"}
              methodology={tMethod("fightReversalRate")}
            />
            <MetricCard
              label={t("killsPerUltimate")}
              value={advancedMetrics.killsPerUltimate.toFixed(2)}
              sentiment={advancedMetrics.killsPerUltimate > 1.5 ? "positive" : "neutral"}
              methodology={tMethod("killsPerUltimate")}
            />
            <MetricCard
              label={t("consistencyScore")}
              value={advancedMetrics.consistencyScore.toFixed(0)}
              subtitle={t("outOf100")}
              sentiment={advancedMetrics.consistencyScore > 75 ? "positive" : advancedMetrics.consistencyScore < 50 ? "negative" : "neutral"}
              methodology={tMethod("consistencyScore")}
            />
            <MetricCard
              label={t("mapsPlayed")}
              value={String(mapsPlayed)}
              sentiment="neutral"
              methodology={tMethod("mapsPlayed")}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  sentiment,
  methodology,
}: {
  label: string;
  value: string;
  subtitle?: string;
  sentiment: "positive" | "negative" | "neutral";
  methodology: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border p-3">
      <div>
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p
          className={cn(
            "mt-1 text-2xl font-bold tabular-nums",
            sentiment === "positive" && "text-emerald-600 dark:text-emerald-400",
            sentiment === "negative" && "text-red-600 dark:text-red-400"
          )}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-muted-foreground text-xs tabular-nums">{subtitle}</p>
        )}
      </div>
      <p className="text-muted-foreground mt-2 text-[10px] leading-relaxed">
        {methodology}
      </p>
    </div>
  );
}
