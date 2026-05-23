"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type {
  UltAdvantageBucketKey,
  UltEconomyAnalysis,
} from "@/data/team/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

type UltEconomyCardProps = {
  analysis: UltEconomyAnalysis;
};

const BUCKET_LABEL_KEY: Record<UltAdvantageBucketKey, string> = {
  behind2: "bucketBehind2",
  behind1: "bucketBehind1",
  even: "bucketEven",
  ahead1: "bucketAhead1",
  ahead2: "bucketAhead2",
};

function winrateClass(winrate: number): string {
  if (winrate >= 55) return "text-primary";
  if (winrate < 45) return "text-destructive";
  return "text-foreground";
}

export function UltEconomyCard({ analysis }: UltEconomyCardProps) {
  const t = useTranslations("teamStatsPage.ultimatesTab.ultAdvantage");

  if (analysis.totalFights === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow="Ultimates · Advantage" title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const tempoThreshold = Math.max(5, Math.round(analysis.totalMaps * 0.1));
  const tempoAll = analysis.tempo;
  const tempoFiltered = tempoAll.filter((p) => p.samples >= tempoThreshold);
  const tempoData = tempoFiltered.length >= 2 ? tempoFiltered : tempoAll;

  const tempoConfig: ChartConfig = {
    avgAdvantage: { label: t("avgAdvantage"), color: "var(--chart-1)" },
  };
  const shapeConfig: ChartConfig = {
    fights: { label: t("fightsAxis"), color: "var(--chart-1)" },
  };
  const shapeData = analysis.buckets.map((b) => ({
    key: b.key,
    fights: b.fights,
  }));

  const headline = [
    {
      label: t("avgAdvantage"),
      value: `${analysis.avgAdvantage > 0 ? "+" : ""}${analysis.avgAdvantage.toFixed(2)}`,
      sub: t("avgAdvantageSub"),
      tone:
        analysis.avgAdvantage > 0.1
          ? "text-primary"
          : analysis.avgAdvantage < -0.1
            ? "text-destructive"
            : "text-foreground",
    },
    {
      label: t("winWhenAhead"),
      value: `${analysis.winrateAhead.toFixed(0)}%`,
      sub: t("ofFights", { pct: analysis.advantagedShare.toFixed(0) }),
      tone: winrateClass(analysis.winrateAhead),
    },
    {
      label: t("winWhenBehind"),
      value: `${analysis.winrateBehind.toFixed(0)}%`,
      sub: t("ofFights", { pct: analysis.disadvantagedShare.toFixed(0) }),
      tone: winrateClass(analysis.winrateBehind),
    },
  ];

  const distribution = [
    {
      label: t("behind"),
      share: analysis.disadvantagedShare,
      color: "var(--destructive)",
    },
    {
      label: t("even"),
      share: analysis.evenShare,
      color: "var(--muted-foreground)",
    },
    {
      label: t("ahead"),
      share: analysis.advantagedShare,
      color: "var(--primary)",
    },
  ];

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Ultimates · Advantage"
        title={t("title")}
        description={t("description", { maps: analysis.totalMaps })}
      />

      <dl className="border-border grid grid-cols-1 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-3 sm:divide-y-0">
        {headline.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 px-4 py-3">
            <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {row.label}
            </dt>
            <dd
              className={cn(
                "font-mono text-2xl leading-none font-semibold tabular-nums",
                row.tone
              )}
            >
              {row.value}
            </dd>
            <dd className="text-muted-foreground text-xs">{row.sub}</dd>
          </div>
        ))}
      </dl>

      {/* Distribution: how often we enter fights behind / even / ahead */}
      <div className="space-y-2.5">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("distributionCaption")}
        </p>
        <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
          {distribution.map((seg) =>
            seg.share > 0 ? (
              <div
                key={seg.label}
                style={{ width: `${seg.share}%`, backgroundColor: seg.color }}
                title={`${seg.label}: ${seg.share.toFixed(0)}%`}
              />
            ) : null
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          {distribution.map((seg) => (
            <span key={seg.label} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2 rounded-[2px]"
                style={{ backgroundColor: seg.color }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground">{seg.label}</span>
              <span className="text-foreground font-mono tabular-nums">
                {seg.share.toFixed(0)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Win rate by ultimate advantage entering the fight, with a small
          distribution curve beside it (same per-bucket fight counts). */}
      <div className="space-y-2.5">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("winrateCaption")}
        </p>
        <div className="grid gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:items-center">
          <ol className="space-y-0.5">
            {analysis.buckets.map((bucket) => (
              <li
                key={bucket.key}
                className="grid grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-1 rounded-md px-2 py-1.5 sm:grid-cols-[6.5rem_1fr] sm:gap-x-4"
              >
                <span className="text-sm">
                  {t(BUCKET_LABEL_KEY[bucket.key])}
                </span>
                {bucket.fights === 0 ? (
                  <span className="text-muted-foreground/60 text-xs">
                    {t("noFights")}
                  </span>
                ) : (
                  <div className="flex items-center gap-3">
                    <div
                      className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full"
                      role="presentation"
                    >
                      <div
                        className="bg-primary absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${Math.max(2, bucket.winrate)}%` }}
                      />
                    </div>
                    <div className="flex w-[6.5rem] shrink-0 items-baseline justify-end gap-1.5 font-mono tabular-nums">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          winrateClass(bucket.winrate)
                        )}
                      >
                        {bucket.winrate.toFixed(0)}%
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {t("fightsCount", { count: bucket.fights })}
                      </span>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>

          <figure className="space-y-1.5">
            <figcaption className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              {t("shapeCaption")}
            </figcaption>
            <ChartContainer config={shapeConfig} className="h-[130px] w-full">
              <AreaChart
                accessibilityLayer
                data={shapeData}
                margin={{ left: 2, right: 2, top: 6, bottom: 0 }}
              >
                <YAxis hide domain={[0, "dataMax"]} />
                {/* Axis hidden: edge category labels clip. They're rendered as
                    a justify-between row below the chart instead. */}
                <XAxis dataKey="key" hide />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) =>
                        t(
                          BUCKET_LABEL_KEY[label as UltAdvantageBucketKey] ??
                            "bucketEven"
                        )
                      }
                    />
                  }
                />
                <Area
                  dataKey="fights"
                  type="natural"
                  stroke="var(--color-fights)"
                  fill="var(--color-fights)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
            <div className="text-muted-foreground flex justify-between font-mono text-[9px] tracking-[0.12em] uppercase">
              <span>{t("behind")}</span>
              <span>{t("even")}</span>
              <span>{t("ahead")}</span>
            </div>
          </figure>
        </div>
      </div>

      {/* Tempo: average ult advantage by fight number */}
      {tempoData.length >= 2 && (
        <div className="space-y-2.5">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("tempoCaption")}
          </p>
          <ChartContainer config={tempoConfig} className="h-[200px] w-full">
            <AreaChart
              accessibilityLayer
              data={tempoData}
              margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="fightNumber"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: number) => t("fightTick", { n: v })}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) =>
                      t("fightTick", { n: Number(label) })
                    }
                  />
                }
              />
              <Area
                dataKey="avgAdvantage"
                type="monotone"
                stroke="var(--color-avgAdvantage)"
                fill="var(--color-avgAdvantage)"
                fillOpacity={0.18}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
          <p className="text-muted-foreground text-xs">{t("tempoHint")}</p>
        </div>
      )}
    </section>
  );
}
