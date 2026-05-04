import { SectionHeader } from "@/components/stats/team/section-header";
import type { TeamFightStats } from "@/data/team/types";
import { cn, round } from "@/lib/utils";
import { useTranslations } from "next-intl";

type TeamFightStatsCardProps = {
  fightStats: TeamFightStats;
};

type FightCell = {
  label: string;
  value: string;
  sub: string;
  emphasis?: boolean;
};

export function TeamFightStatsCard({ fightStats }: TeamFightStatsCardProps) {
  const t = useTranslations("teamStats.fightStats");

  if (fightStats.totalFights === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow="Teamfights · Fight stats" title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const dryFightPercentage =
    fightStats.totalFights > 0
      ? (fightStats.dryFights / fightStats.totalFights) * 100
      : 0;

  const cells: FightCell[] = [
    {
      label: t("overallWinrate"),
      value: `${round(fightStats.overallWinrate)}%`,
      sub: t("record", {
        wins: fightStats.fightsWon,
        losses: fightStats.fightsLost,
      }),
      emphasis: true,
    },
  ];

  if (fightStats.firstPickFights > 0) {
    cells.push({
      label: t("firstPickWinrate"),
      value: `${round(fightStats.firstPickWinrate)}%`,
      sub: t("firstPickCount", { count: fightStats.firstPickFights }),
    });
  }

  if (fightStats.firstDeathFights > 0) {
    cells.push({
      label: t("firstDeathWinrate"),
      value: `${round(fightStats.firstDeathWinrate)}%`,
      sub: t("firstDeathCount", { count: fightStats.firstDeathFights }),
    });
  }

  if (fightStats.firstUltFights > 0) {
    cells.push({
      label: t("firstUltWinrate"),
      value: `${round(fightStats.firstUltWinrate)}%`,
      sub: t("firstUltCount", { count: fightStats.firstUltFights }),
    });
  }

  cells.push({
    label: t("dryFights"),
    value: `${round(dryFightPercentage)}%`,
    sub: t("dryFightDetails", {
      count: fightStats.dryFights,
      winrate: round(fightStats.dryFightWinrate),
    }),
  });

  if (fightStats.nonDryFights > 0) {
    cells.push({
      label: t("avgUltsPerFight"),
      value: `${round(fightStats.avgUltsPerNonDryFight)}`,
      sub: t("avgUltsDescription", {
        count: fightStats.nonDryFights,
      }),
    });
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Teamfights · Fight stats"
        title={t("title")}
        description={t("description", { count: fightStats.totalFights })}
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
