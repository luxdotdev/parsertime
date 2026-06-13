import { ScrimOverviewTabs } from "@/components/scrim/scrim-overview-tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ScrimPositionalArtifacts } from "@/data/scrim/positional-artifacts-service";
import type { ScrimPositionalStats } from "@/data/scrim/positional-stats-service";
import type { ScrimInitiationData, ScrimInsight, ScrimOverviewData } from "@/data/scrim/types";
import { format } from "@/lib/utils";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
  LightningBoltIcon,
  StarFilledIcon,
} from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";

export function WinLossBadge({
  wins,
  losses,
  draws,
}: {
  wins: number;
  losses: number;
  draws: number;
}) {
  const t = useTranslations("scrimPage.overviewSummary");

  return (
    <div
      className="flex items-center gap-2"
      aria-label={t("recordAria", { wins, losses, draws })}
    >
      <span className="text-sm font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
        {t("record.wins", { count: wins })}
      </span>
      <span className="text-muted-foreground text-sm">·</span>
      <span className="text-sm font-semibold text-rose-600 tabular-nums dark:text-rose-400">
        {t("record.losses", { count: losses })}
      </span>
      {draws > 0 && (
        <>
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-muted-foreground text-sm font-semibold tabular-nums">
            {t("record.draws", { count: draws })}
          </span>
        </>
      )}
    </div>
  );
}

export function WinRateBadge({
  wins,
  mapCount,
}: {
  wins: number;
  mapCount: number;
}) {
  const t = useTranslations("scrimPage.overviewSummary");
  const winRate = mapCount > 0 ? Math.round((wins / mapCount) * 100) : 0;

  return (
    <Badge variant="secondary" className="tabular-nums">
      {t("winRate", { winRate })}
    </Badge>
  );
}

function StatSummaryCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">
        {label}
        {sub ? ` · ${sub}` : ""}
      </span>
    </div>
  );
}

function InsightIcon({ type }: { type: ScrimInsight["type"] }) {
  switch (type) {
    case "mvp":
      return (
        <StarFilledIcon className="text-primary h-3.5 w-3.5" aria-hidden />
      );
    case "most_improved":
      return (
        <ArrowUpIcon className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
      );
    case "most_declined":
      return (
        <ArrowDownIcon className="h-3.5 w-3.5 text-rose-500" aria-hidden />
      );
    case "outlier_positive":
      return (
        <LightningBoltIcon
          className="h-3.5 w-3.5 text-emerald-500"
          aria-hidden
        />
      );
    case "outlier_negative":
      return (
        <ExclamationTriangleIcon
          className="text-destructive h-3.5 w-3.5"
          aria-hidden
        />
      );
  }
}

export function ScrimOverviewSection({
  data,
  positionalStats = null,
  positionalArtifacts = null,
  initiation = null,
}: {
  data: ScrimOverviewData;
  positionalStats?: ScrimPositionalStats | null;
  positionalArtifacts?: ScrimPositionalArtifacts | null;
  initiation?: ScrimInitiationData | null;
}) {
  const t = useTranslations("scrimPage.overviewSummary");

  if (data.mapCount === 0 || data.teamPlayers.length === 0) {
    return null;
  }

  const { wins, losses, mapCount, teamTotals, insights } = data;
  const kdDisplay = teamTotals.kdRatio.toFixed(2);
  const totalElims = teamTotals.eliminations;
  const totalDamage = teamTotals.heroDamage;

  return (
    <section aria-label={t("ariaLabel")} className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatSummaryCell
          label={t("stats.maps")}
          value={String(mapCount)}
          sub={t("stats.record", { wins, losses })}
        />
        <span className="bg-border h-4 w-px shrink-0" aria-hidden />
        <StatSummaryCell
          label={t("stats.teamKd")}
          value={kdDisplay}
          sub={t("stats.elims", { count: totalElims })}
        />
        <span className="bg-border h-4 w-px shrink-0" aria-hidden />
        <StatSummaryCell
          label={t("stats.totalDamage")}
          value={format(Math.round(totalDamage))}
          sub={t("stats.heroDamage")}
        />
        <span className="bg-border h-4 w-px shrink-0" aria-hidden />
        <StatSummaryCell
          label={t("stats.totalHealing")}
          value={format(Math.round(teamTotals.healing))}
          sub={t("stats.healingDealt")}
        />
      </div>

      {insights.length > 0 && (
        <div>
          <h2 className="text-muted-foreground mb-2 font-mono text-[11px] tracking-[0.14em] uppercase">
            {t("keyInsights")}
          </h2>
          <ul className="space-y-1.5">
            {insights.map((insight) => (
              <li
                key={insight.headline}
                className="flex items-start gap-2 text-sm"
              >
                <span className="mt-1 shrink-0">
                  <InsightIcon type={insight.type} />
                </span>
                <span className="text-foreground/90 leading-relaxed">
                  {insight.headline}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Separator />

      <ScrimOverviewTabs
        data={data}
        positionalStats={positionalStats}
        positionalArtifacts={positionalArtifacts}
        initiation={initiation}
      />
    </section>
  );
}
