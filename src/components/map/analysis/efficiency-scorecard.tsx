"use client";

import { Badge } from "@/components/ui/badge";
import type { UltEfficiency } from "@/data/scrim/types";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";

type EfficiencyScorecardProps = {
  teamName: string;
  teamColor: string;
  efficiency: UltEfficiency;
};

function getEfficiencyRatingKey(value: number) {
  if (value >= 0.4) return { key: "excellent", variant: "default" as const };
  if (value >= 0.25) return { key: "good", variant: "secondary" as const };
  if (value >= 0.15) return { key: "average", variant: "outline" as const };
  return { key: "poor", variant: "destructive" as const };
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
      <p className="text-muted-foreground font-mono text-[10px] tracking-[0.06em] uppercase">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          className
        )}
      >
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
  const t = useTranslations("mapPage.overview.analysis.efficiency.scorecard");
  const formatter = useFormatter();
  const rating = getEfficiencyRatingKey(eff.ultimateEfficiency);
  const nonDryWinrate =
    eff.nonDryFights > 0
      ? eff.fightsWon / eff.nonDryFights
      : 0;

  return (
    <div className="bg-muted/30 ring-foreground/10 rounded-lg p-3 shadow-xs ring-1">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: teamColor }}>
          {teamName}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold tabular-nums">
            {formatter.number(eff.ultimateEfficiency, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}
          </span>
          <Badge variant={rating.variant} className="text-[10px]">
            {t(rating.key)}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-2">
        <StatCell
          label={t("wonFights")}
          value={t("ultsPerFight", {
            count: formatter.number(eff.avgUltsInWonFights, {
              maximumFractionDigits: 1,
              minimumFractionDigits: 1,
            }),
          })}
          className="text-emerald-600 dark:text-emerald-400"
        />
        <StatCell
          label={t("lostFights")}
          value={t("ultsPerFight", {
            count: formatter.number(eff.avgUltsInLostFights, {
              maximumFractionDigits: 1,
              minimumFractionDigits: 1,
            }),
          })}
          className="text-rose-600 dark:text-rose-400"
        />
        <StatCell
          label={t("wasted")}
          value={formatter.number(eff.wastedUltimates)}
        />
        <StatCell
          label={t("dryFights")}
          value={formatter.number(eff.dryFights)}
        />
        <StatCell
          label={t("winRate")}
          value={formatter.number(nonDryWinrate, {
            maximumFractionDigits: 1,
            minimumFractionDigits: 1,
            style: "percent",
          })}
        />
        <StatCell
          label={t("reversal")}
          value={formatter.number(eff.nonDryFightReversalRate / 100, {
            maximumFractionDigits: 1,
            minimumFractionDigits: 1,
            style: "percent",
          })}
        />
      </div>
    </div>
  );
}
