"use client";

import { Badge } from "@/components/ui/badge";
import type { UltEfficiency } from "@/data/scrim-overview-dto";
import { cn } from "@/lib/utils";

type EfficiencyScorecardProps = {
  teamName: string;
  teamColor: string;
  efficiency: UltEfficiency;
};

function getEfficiencyRating(value: number) {
  if (value >= 0.4) return { label: "Excellent", variant: "default" as const };
  if (value >= 0.25) return { label: "Good", variant: "secondary" as const };
  if (value >= 0.15) return { label: "Average", variant: "outline" as const };
  return { label: "Poor", variant: "destructive" as const };
}

function StatCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
        {label}
      </p>
      <p className={cn("text-sm font-semibold tabular-nums", className)}>
        {value}
      </p>
    </div>
  );
}

export function EfficiencyScorecard({
  teamName,
  teamColor,
  efficiency: eff,
}: EfficiencyScorecardProps) {
  const rating = getEfficiencyRating(eff.ultimateEfficiency);
  const nonDryWinrate =
    eff.nonDryFights > 0
      ? ((eff.fightsWon / eff.nonDryFights) * 100).toFixed(1)
      : "0.0";

  return (
    <div
      className="rounded-lg bg-zinc-50 p-3 shadow-[inset_4px_0_0_var(--team-color),0_1px_2px_0_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] dark:bg-zinc-900/50 dark:shadow-[inset_4px_0_0_var(--team-color),0_1px_2px_0_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.04)]"
      style={{ "--team-color": teamColor } as React.CSSProperties}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: teamColor }}>
          {teamName}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tabular-nums">
            {eff.ultimateEfficiency.toFixed(2)}
          </span>
          <Badge variant={rating.variant} className="text-[10px]">
            {rating.label}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-2">
        <StatCell
          label="Won Fights"
          value={`${eff.avgUltsInWonFights.toFixed(1)} ults/fight`}
          className="text-green-600 dark:text-green-400"
        />
        <StatCell
          label="Lost Fights"
          value={`${eff.avgUltsInLostFights.toFixed(1)} ults/fight`}
          className="text-red-600 dark:text-red-400"
        />
        <StatCell label="Wasted" value={String(eff.wastedUltimates)} />
        <StatCell label="Dry Fights" value={String(eff.dryFights)} />
        <StatCell label="Win Rate" value={`${nonDryWinrate}%`} />
        <StatCell
          label="Reversal"
          value={`${eff.nonDryFightReversalRate.toFixed(1)}%`}
        />
      </div>
    </div>
  );
}
