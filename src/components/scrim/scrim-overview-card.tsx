import { CollapsibleCard } from "@/components/scrim/collapsible-card-wrapper";
import { ScrimOverviewTabs } from "@/components/scrim/scrim-overview-tabs";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ScrimInsight } from "@/data/scrim/types";
import { ScrimOverviewService } from "@/data/scrim";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
import { format } from "@/lib/utils";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LightningBoltIcon,
  StarFilledIcon,
} from "@radix-ui/react-icons";

type ScrimOverviewCardProps = {
  scrimId: number;
  teamId: number;
};

function WinLossBadge({
  wins,
  losses,
  draws,
}: {
  wins: number;
  losses: number;
  draws: number;
}) {
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Record: ${wins} wins, ${losses} losses, ${draws} draws`}
    >
      <span className="text-sm font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
        {wins}W
      </span>
      <span className="text-muted-foreground text-sm">·</span>
      <span className="text-sm font-semibold text-rose-600 tabular-nums dark:text-rose-400">
        {losses}L
      </span>
      {draws > 0 && (
        <>
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-muted-foreground text-sm font-semibold tabular-nums">
            {draws}D
          </span>
        </>
      )}
    </div>
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
        <StarFilledIcon className="h-3.5 w-3.5 text-amber-500" aria-hidden />
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
        <LightningBoltIcon className="h-3.5 w-3.5 text-sky-500" aria-hidden />
      );
    case "outlier_negative":
      return (
        <ExclamationTriangleIcon
          className="h-3.5 w-3.5 text-orange-500"
          aria-hidden
        />
      );
  }
}

function InsightChip({ insight }: { insight: ScrimInsight }) {
  return (
    <div className="bg-muted/60 border-border flex min-w-0 flex-1 items-start gap-2 rounded-lg border p-3">
      <span className="mt-0.5 shrink-0">
        <InsightIcon type={insight.type} />
      </span>
      <p className="text-foreground min-w-0 text-xs leading-relaxed">
        {insight.headline}
      </p>
    </div>
  );
}

export async function ScrimOverviewCard({
  scrimId,
  teamId,
}: ScrimOverviewCardProps) {
  const data = await AppRuntime.runPromise(
    ScrimOverviewService.pipe(
      Effect.flatMap((svc) => svc.getScrimOverview(scrimId, teamId))
    )
  );

  if (data.mapCount === 0 || data.teamPlayers.length === 0) {
    return null;
  }

  const { wins, losses, draws, mapCount, teamTotals, insights } = data;

  const winRate = mapCount > 0 ? Math.round((wins / mapCount) * 100) : 0;
  const kdDisplay = teamTotals.kdRatio.toFixed(2);
  const totalElims = teamTotals.eliminations;
  const totalDamage = teamTotals.heroDamage;

  const headlineInsight = insights.find(
    (i) => i.type === "mvp" || i.type === "outlier_positive"
  );

  return (
    <CollapsibleCard
      header={
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">
              Scrim Overview
            </CardTitle>
            {headlineInsight && (
              <p className="text-muted-foreground text-sm">
                {headlineInsight.headline}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <WinLossBadge wins={wins} losses={losses} draws={draws} />
            <Badge variant="secondary" className="tabular-nums">
              {winRate}% win rate
            </Badge>
          </div>
        </div>
      }
    >
      <CardContent className="mb-4 space-y-6">
        {/* Summary stats row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatSummaryCell
            label="Maps"
            value={String(mapCount)}
            sub={`${wins}W · ${losses}L`}
          />
          <span className="bg-border h-4 w-px shrink-0" aria-hidden />
          <StatSummaryCell
            label="Team K/D"
            value={kdDisplay}
            sub={`${totalElims} elims`}
          />
          <span className="bg-border h-4 w-px shrink-0" aria-hidden />
          <StatSummaryCell
            label="Total Damage"
            value={format(Math.round(totalDamage))}
            sub="hero damage"
          />
          <span className="bg-border h-4 w-px shrink-0" aria-hidden />
          <StatSummaryCell
            label="Total Healing"
            value={format(Math.round(teamTotals.healing))}
            sub="healing dealt"
          />
        </div>

        {insights.length > 0 && (
          <>
            <Separator />
            <section aria-label="Performance insights">
              <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
                Key Insights
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {insights.map((insight) => (
                  <InsightChip key={insight.headline} insight={insight} />
                ))}
              </div>
            </section>
          </>
        )}

        <Separator />
        <ScrimOverviewTabs data={data} />
      </CardContent>
      <CardFooter className="border-t">
        <div className="flex items-center gap-1.5">
          <InfoCircledIcon
            className="text-muted-foreground h-3.5 w-3.5 shrink-0"
            aria-hidden
          />
          <p className="text-muted-foreground text-xs">
            Hover over a player&apos;s name to see their performance trend
            across maps.
          </p>
        </div>
      </CardFooter>
    </CollapsibleCard>
  );
}
