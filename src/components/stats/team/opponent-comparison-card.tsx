"use client";

import { formatDelta } from "@/lib/tempo/classify";
import {
  classifyOpponentDelta,
  type OpponentTempoComparison,
} from "@/lib/tempo/opponent-benchmark";
import { useTranslations } from "next-intl";

type Props = {
  metricLabel: string;
  comparison: OpponentTempoComparison;
};

export function OpponentComparisonCard({ metricLabel, comparison }: Props) {
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
      <div>
        <p className="text-foreground text-sm font-medium">{metricLabel}</p>
        <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
          {t("title", { maps: comparison.mapsWithData })}
        </p>
      </div>

      <p className="font-mono text-sm tabular-nums">
        {t("you")} {comparison.ourValue.toFixed(1)}s · {t("opponents")}{" "}
        {comparison.opponentMean.toFixed(1)}s ·{" "}
        <span className="text-foreground font-medium">{headline}</span>
      </p>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.12em] uppercase">
            <th className="py-1 text-left font-medium">{t("colOpponent")}</th>
            <th className="py-1 text-right font-medium">{t("colAvg")}</th>
            <th className="py-1 text-right font-medium">{t("colDelta")}</th>
            <th className="py-1 text-right font-medium">{t("colMaps")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {comparison.perOpponent.map((group) => (
            <tr key={group.opponentTeamId ?? "unnamed"}>
              <td className="text-muted-foreground py-1 text-left">
                {group.name ?? t("unnamed")}
              </td>
              <td className="py-1 text-right font-mono tabular-nums">
                {group.mean.toFixed(1)}s
              </td>
              <td className="py-1 text-right font-mono tabular-nums">
                {formatDelta(group.delta)}s
              </td>
              <td className="text-muted-foreground py-1 text-right font-mono tabular-nums">
                {group.maps}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
