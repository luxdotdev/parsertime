"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { UltCombosAnalysis, UltComboStat } from "@/data/team/types";
import { cn, toHero } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo, useState } from "react";

type UltCombosCardProps = {
  analysis: UltCombosAnalysis;
};

type ComboMetric = "usage" | "winrate";

const MAX_ROWS = 8;
/** Combos used fewer than this many times are too small a sample to rank by win rate. */
const MIN_WINRATE_SAMPLE = 5;

function winrateClass(winrate: number): string {
  if (winrate >= 55) return "text-primary";
  if (winrate < 45) return "text-destructive";
  return "text-foreground";
}

export function UltCombosCard({ analysis }: UltCombosCardProps) {
  const t = useTranslations("teamStatsPage.ultimatesTab.combos");
  const [metric, setMetric] = useState<ComboMetric>("usage");

  const maxCount = useMemo(
    () => Math.max(1, ...analysis.combos.map((c) => c.count)),
    [analysis.combos]
  );

  const rows = useMemo<UltComboStat[]>(() => {
    if (metric === "usage") {
      return [...analysis.combos]
        .sort((a, b) => b.count - a.count || b.winrate - a.winrate)
        .slice(0, MAX_ROWS);
    }
    return [...analysis.combos]
      .filter((c) => c.count >= MIN_WINRATE_SAMPLE)
      .sort((a, b) => b.winrate - a.winrate || b.count - a.count)
      .slice(0, MAX_ROWS);
  }, [analysis.combos, metric]);

  const hiddenByFilter =
    metric === "winrate" &&
    analysis.combos.some((c) => c.count < MIN_WINRATE_SAMPLE);

  if (analysis.combos.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow="Ultimates · Combos" title={t("title")} />
        <p className="text-muted-foreground text-sm">
          {t("noData", { window: analysis.windowSeconds })}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Ultimates · Combos"
        title={t("title")}
        description={t("description", {
          window: analysis.windowSeconds,
          maps: analysis.totalMaps,
        })}
        rightSlot={
          <ToggleGroup
            type="single"
            value={metric}
            onValueChange={(value) => value && setMetric(value as ComboMetric)}
            variant="outline"
            size="sm"
            aria-label={t("metricLabel")}
          >
            <ToggleGroupItem value="usage">{t("mostUsed")}</ToggleGroupItem>
            <ToggleGroupItem value="winrate">{t("winRate")}</ToggleGroupItem>
          </ToggleGroup>
        }
      />

      <div className="space-y-2.5">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {metric === "usage"
            ? t("captionMostUsed")
            : t("captionWinRate", { min: MIN_WINRATE_SAMPLE })}
        </p>

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("winrateNeedsSamples", { min: MIN_WINRATE_SAMPLE })}
          </p>
        ) : (
          <ol className="space-y-0.5">
            {rows.map((combo) => {
              const fill =
                metric === "usage"
                  ? (combo.count / maxCount) * 100
                  : combo.winrate;
              return (
                <li
                  key={`${combo.heroA}|${combo.heroB}`}
                  className="hover:bg-muted/40 -mx-2 grid grid-cols-[minmax(8rem,13rem)_1fr] items-center gap-x-3 gap-y-1 rounded-md px-2 py-1.5 transition-colors sm:gap-x-4"
                  title={t("rowSummary", {
                    heroA: combo.heroA,
                    heroB: combo.heroB,
                    count: combo.count,
                    winrate: combo.winrate.toFixed(0),
                  })}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex shrink-0 -space-x-1.5">
                      <Image
                        src={`/heroes/${toHero(combo.heroA)}.png`}
                        alt={combo.heroA}
                        width={24}
                        height={24}
                        className="border-card rounded-sm border-2"
                      />
                      <Image
                        src={`/heroes/${toHero(combo.heroB)}.png`}
                        alt={combo.heroB}
                        width={24}
                        height={24}
                        className="border-card rounded-sm border-2"
                      />
                    </div>
                    <span className="truncate text-sm">
                      {combo.heroA}
                      <span className="text-muted-foreground"> + </span>
                      {combo.heroB}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full"
                      role="presentation"
                    >
                      <div
                        className="bg-primary absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${Math.max(2, fill)}%` }}
                      />
                    </div>
                    <div className="flex w-[5.5rem] shrink-0 items-baseline justify-end gap-1.5 font-mono tabular-nums">
                      {metric === "usage" ? (
                        <>
                          <span className="text-foreground text-sm font-semibold">
                            {combo.count}
                          </span>
                          <span
                            className={cn(
                              "text-xs",
                              winrateClass(combo.winrate)
                            )}
                          >
                            {combo.winrate.toFixed(0)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              winrateClass(combo.winrate)
                            )}
                          >
                            {combo.winrate.toFixed(0)}%
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {t("sampleSize", { count: combo.count })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {hiddenByFilter && rows.length > 0 && (
          <p className="text-muted-foreground text-xs">
            {t("lowSampleNote", { min: MIN_WINRATE_SAMPLE })}
          </p>
        )}
      </div>
    </section>
  );
}
