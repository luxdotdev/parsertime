"use client";

import { OpponentDeltaChart } from "@/components/stats/team/opponent-delta-chart";
import {
  classifyOpponentDelta,
  type OpponentTempoComparison,
} from "@/lib/tempo/opponent-benchmark";
import { useTranslations } from "next-intl";

export function OpponentComparisonSection({
  metricLabel,
  comparison,
}: {
  metricLabel: string;
  comparison: OpponentTempoComparison;
}) {
  const t = useTranslations("teamStatsPage.ultimatesTab.overview.vsOpponents");

  const bucket = classifyOpponentDelta(comparison.delta);
  const absDelta = Math.abs(comparison.delta).toFixed(1);
  const headline =
    bucket === "faster"
      ? t("readFaster", { delta: absDelta })
      : bucket === "slower"
        ? t("readSlower", { delta: absDelta })
        : t("readEven");

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          {metricLabel} · {t("title", { maps: comparison.mapsWithData })}
        </p>
        <p className="font-mono text-sm tabular-nums">
          {t("you")} {comparison.ourValue.toFixed(1)}s · {t("opponents")}{" "}
          {comparison.opponentMean.toFixed(1)}s ·{" "}
          <span className="text-foreground font-medium">{headline}</span>
        </p>
      </div>
      <OpponentDeltaChart comparison={comparison} />
    </div>
  );
}
