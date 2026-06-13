import { SectionHeader } from "@/components/stats/team/section-header";
import type { TeamInitiationStats } from "@/data/team/types";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";

type TeamInitiationCardProps = {
  initiationStats: TeamInitiationStats;
};

type InitiationCell = {
  label: string;
  value: string;
  sub: string;
  emphasis?: boolean;
};

export function TeamInitiationCard({ initiationStats }: TeamInitiationCardProps) {
  const t = useTranslations("teamStats.initiationStats");
  const format = useFormatter();

  function formatPercent(value: number): string {
    return format.number(value / 100, {
      style: "percent",
      maximumFractionDigits: 0,
    });
  }

  if (initiationStats.decidedFights === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const cells: InitiationCell[] = [
    {
      label: t("initiationWinrate"),
      value: formatPercent(initiationStats.initiationWinrate),
      sub: t("firstRecord", {
        wins: initiationStats.wentFirstWins,
        losses: initiationStats.wentFirst - initiationStats.wentFirstWins,
      }),
      emphasis: true,
    },
    {
      label: t("initiationFrequency"),
      value: formatPercent(initiationStats.initiationFrequency),
      sub: t("frequencySub", {
        first: initiationStats.wentFirst,
        decided: initiationStats.decidedFights,
      }),
    },
    {
      label: t("goingSecondWinrate"),
      value: formatPercent(initiationStats.goingSecondWinrate),
      sub: t("secondRecord", {
        wins: initiationStats.wentSecondWins,
        losses: initiationStats.wentSecond - initiationStats.wentSecondWins,
      }),
    },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description", {
          covered: initiationStats.mapsCovered,
          total: initiationStats.mapsTotal,
        })}
      />
      <dl className="border-border grid grid-cols-1 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-3 lg:divide-y-0">
        {cells.map((cell) => (
          <div key={cell.label} className="flex flex-col gap-1 px-4 py-4">
            <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {cell.label}
            </dt>
            <dd
              className={cn(
                "font-mono text-2xl leading-none font-semibold tabular-nums",
                cell.emphasis ? "text-primary" : "text-foreground"
              )}
            >
              {cell.value}
            </dd>
            <dd className="text-muted-foreground text-xs">{cell.sub}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
