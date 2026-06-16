import { SectionHeader } from "@/components/stats/team/section-header";
import { cn } from "@/lib/utils";
import type { RecentFormData } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";

type RecentFormChartProps = {
  data: RecentFormData;
  window?: number;
};

type FormStats = RecentFormData["recent"];

function WinrateMiniBar({ stats }: { stats: FormStats }) {
  const winPct = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
  const lossPct = stats.total > 0 ? (stats.losses / stats.total) * 100 : 0;
  const drawPct = stats.total > 0 ? (stats.draws / stats.total) * 100 : 0;

  return (
    <div
      className="flex h-1.5 w-full overflow-hidden rounded-full"
      aria-hidden="true"
    >
      <div
        className="bg-chart-win transition-all"
        style={{ width: `${winPct}%` }}
      />
      {drawPct > 0 && (
        <div
          className="bg-muted-foreground/40 transition-all"
          style={{ width: `${drawPct}%` }}
        />
      )}
      <div
        className="bg-chart-loss transition-all"
        style={{ width: `${lossPct}%` }}
      />
    </div>
  );
}

function FormColumn({
  label,
  stats,
  colorClass,
}: {
  label: string;
  stats: FormStats;
  colorClass?: string;
}) {
  const t = useTranslations("ranked.charts.recentForm");
  return (
    <div className="flex flex-1 flex-col gap-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p
        className={cn("font-mono text-4xl font-bold tabular-nums", colorClass)}
      >
        {stats.winrate}%
      </p>
      <WinrateMiniBar stats={stats} />
      <p className="text-muted-foreground text-xs tabular-nums">
        {stats.draws > 0
          ? t("recordWithDraws", {
              wins: stats.wins,
              losses: stats.losses,
              draws: stats.draws,
            })
          : t("record", { wins: stats.wins, losses: stats.losses })}
        <span className="ml-1 opacity-60">
          {t("gamesCount", { count: stats.total })}
        </span>
      </p>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const t = useTranslations("ranked.charts.recentForm");
  const positive = delta >= 0;
  return (
    <div
      aria-label={t("deltaLabel", { sign: positive ? "+" : "", delta })}
      className={cn(
        "flex h-7 items-center rounded-full px-2.5 text-xs font-semibold tabular-nums",
        positive
          ? "bg-chart-win/15 text-chart-win"
          : "bg-chart-loss/15 text-chart-loss"
      )}
    >
      {positive ? "+" : ""}
      {delta}%
    </div>
  );
}

export function RecentFormChart({ data, window = 20 }: RecentFormChartProps) {
  const t = useTranslations("ranked.charts.recentForm");
  const { recent, overall, delta, trend } = data;

  const recentColorClass =
    trend === "improving"
      ? "text-chart-win"
      : trend === "declining"
        ? "text-chart-loss"
        : "";

  const description =
    trend === "improving"
      ? t("trendImproving", { delta, window })
      : trend === "declining"
        ? t("trendDeclining", { delta: Math.abs(delta), window })
        : t("trendStable");

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <div className="flex items-stretch gap-6">
        <FormColumn
          label={t("lastGames", { window })}
          stats={recent}
          colorClass={recentColorClass}
        />
        <div className="relative flex shrink-0 self-stretch">
          <div className="bg-border h-full w-px" aria-hidden="true" />
          <div className="bg-background absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 py-1">
            <DeltaBadge delta={delta} />
          </div>
        </div>
        <FormColumn
          label={t("allTime")}
          stats={overall}
          colorClass="text-muted-foreground"
        />
      </div>
      <p className="text-muted-foreground text-xs">
        {t("footer", {
          recent: Math.min(window, recent.total),
          total: overall.total,
        })}
      </p>
    </section>
  );
}
