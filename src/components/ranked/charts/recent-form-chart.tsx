import { SectionHeader } from "@/components/stats/team/section-header";
import { cn } from "@/lib/utils";
import type { RecentFormData } from "@/lib/ranked-stats";

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
  return (
    <div className="flex flex-1 flex-col gap-3">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className={cn("font-mono text-4xl font-bold tabular-nums", colorClass)}>
        {stats.winrate}%
      </p>
      <WinrateMiniBar stats={stats} />
      <p className="text-muted-foreground text-xs tabular-nums">
        {stats.wins}W &ndash; {stats.losses}L
        {stats.draws > 0 ? ` \u2013 ${stats.draws}D` : ""}
        <span className="ml-1 opacity-60">({stats.total} games)</span>
      </p>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <div
      aria-label={`${positive ? "+" : ""}${delta}% compared to overall`}
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

function trendDescription(
  trend: "improving" | "declining" | "stable",
  window: number,
  delta: number
): string {
  if (trend === "improving")
    return `Up ${delta}% vs. your all-time average over your last ${window} games`;
  if (trend === "declining")
    return `Down ${Math.abs(delta)}% vs. your all-time average over your last ${window} games`;
  return `Performing in line with your all-time average`;
}

export function RecentFormChart({ data, window = 20 }: RecentFormChartProps) {
  const { recent, overall, delta, trend } = data;

  const recentColorClass =
    trend === "improving"
      ? "text-chart-win"
      : trend === "declining"
        ? "text-chart-loss"
        : "";

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Recent form"
        title="Recent form"
        description={trendDescription(trend, window, delta)}
      />
      <div className="flex items-stretch gap-6">
        <FormColumn
          label={`Last ${window} games`}
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
          label="All time"
          stats={overall}
          colorClass="text-muted-foreground"
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Comparing last {Math.min(window, recent.total)} games vs.{" "}
        {overall.total} total
      </p>
    </section>
  );
}
