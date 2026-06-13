"use client";

import { DivergingBar, SegmentStrip } from "@/components/faceit/viz";
import { SectionHeader } from "@/components/stats/team/section-header";
import { StatRibbon, type RibbonCell } from "@/components/stats/team/stat-ribbon";
import type { ScrimData } from "@/data/player/types";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";

type Props = {
  scrimData: ScrimData;
};

const Z_MAGNITUDE = 3;

type Tone = "primary" | "destructive" | "muted";

const ROLE_TONE: Record<string, Tone> = {
  Tank: "primary",
  Damage: "muted",
  Support: "muted",
};

export function ScoutingPlayerScrimProfile({ scrimData }: Props) {
  const t = useTranslations("scoutingPage.player.analytics.scrimOverview");
  const tHero = useTranslations(
    "scoutingPage.player.analytics.heroZScores"
  );
  const tKill = useTranslations(
    "scoutingPage.player.analytics.killAnalysis"
  );
  const format = useFormatter();

  const m = scrimData.advancedMetrics;

  const cells: RibbonCell[] = [
    { label: t("mvpScore"), value: format.number(Math.round(m.mvpScore)) },
    { label: t("kdRatio"), value: scrimData.kdRatio.toFixed(2) },
    {
      label: t("firstPickRate"),
      value: `${Math.round(m.firstPickPercentage)}%`,
    },
    {
      label: t("firstDeathRate"),
      value: `${Math.round(m.firstDeathPercentage)}%`,
    },
    {
      label: t("fightReversalRate"),
      value: `${Math.round(m.fightReversalPercentage)}%`,
    },
    { label: t("killsPerUltimate"), value: m.killsPerUltimate.toFixed(1) },
    {
      label: t("consistencyScore"),
      value: format.number(Math.round(m.consistencyScore)),
      sub: t("outOf100"),
    },
    {
      label: t("mapsPlayed"),
      value: format.number(scrimData.mapsPlayed),
    },
  ];

  const heroes = [...scrimData.heroes].sort(
    (a, b) => b.compositeZScore - a.compositeZScore
  );

  const roleSegments = scrimData.roleDistribution.map((entry) => ({
    key: entry.role,
    value: entry.percentage,
    title: `${entry.role}: ${Math.round(entry.percentage)}%`,
    tone: ROLE_TONE[entry.role] ?? "muted",
  }));

  const topTargets = scrimData.killPatterns.topHeroesEliminated.slice(0, 5);
  const topThreats = scrimData.killPatterns.topHeroesDiedTo.slice(0, 5);

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("sectionTitle")}
        description={t("description")}
      />

      <StatRibbon cells={cells} columns={4} />

      <div className="space-y-3">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {tHero("title")}
        </p>
        {heroes.length > 0 ? (
          <ul className="space-y-2.5">
            {heroes.map((hero) => {
              const z = hero.compositeZScore;
              const positive = z >= 0;
              return (
                <li
                  key={hero.hero}
                  className="grid grid-cols-[9rem_1fr_3.25rem_3.5rem] items-center gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-foreground truncate">
                      {hero.hero}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase",
                        hero.role === "Tank"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {hero.role}
                    </span>
                  </span>
                  <DivergingBar value={z} magnitude={Z_MAGNITUDE} />
                  <span
                    className={cn(
                      "text-right font-mono tabular-nums",
                      positive ? "text-primary" : "text-destructive"
                    )}
                  >
                    {positive ? "+" : "-"}
                    {Math.abs(z).toFixed(1)}σ
                  </span>
                  <span className="text-muted-foreground text-right font-mono text-[11px] tracking-[0.14em] uppercase tabular-nums">
                    {tHero("maps", { count: hero.mapsPlayed })}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">{tHero("noData")}</p>
        )}
      </div>

      {roleSegments.length > 0 ? (
        <div className="space-y-2.5">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {tKill("roleDistribution")}
          </p>
          <SegmentStrip segments={roleSegments} />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {roleSegments.map((seg) => (
              <span
                key={seg.key}
                className="text-muted-foreground flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase tabular-nums"
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    seg.tone === "primary"
                      ? "bg-primary"
                      : seg.tone === "destructive"
                        ? "bg-destructive"
                        : "bg-muted-foreground/50"
                  )}
                />
                {seg.key} {Math.round(seg.value)}%
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        <KillList
          label={tKill("topTargets")}
          entries={topTargets}
          countLabel={(count) => tKill("kills", { count })}
        />
        <KillList
          label={tKill("topThreats")}
          entries={topThreats}
          countLabel={(count) => tKill("kills", { count })}
        />
      </div>
    </section>
  );
}

function KillList({
  label,
  entries,
  countLabel,
}: {
  label: string;
  entries: { hero: string; count: number }[];
  countLabel: (count: number) => string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
        {label}
      </p>
      {entries.length > 0 ? (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.hero}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-foreground truncate">{entry.hero}</span>
              <span className="text-muted-foreground shrink-0 font-mono text-[11px] tracking-[0.14em] uppercase tabular-nums">
                {countLabel(entry.count)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
