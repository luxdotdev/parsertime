"use client";

import { SectionHeader } from "@/components/section-header";
import { StatBlock, StatGrid, StatPanel } from "@/components/player/stat-panel";
import { TalentPanel } from "@/components/stats/hero/talent-panel";
import { KillMethodChart } from "@/components/stats/player/charts/kill-methods";
import { StatPer10Chart } from "@/components/stats/player/charts/stat-per-10";
import type { Timeframe } from "@/components/stats/hero/range-picker";
import { Link } from "@/components/ui/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildHeroTalentLeaderboard } from "@/lib/hero-talent-leaderboard";
import type { NonMappableStat, Stat } from "@/lib/player-charts";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { Kill, PlayerStat, Scrim } from "@prisma/client";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { Route } from "next";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

type StatKey = keyof Omit<Stat, NonMappableStat>;

const STAT_OPTIONS: StatKey[] = [
  "eliminations",
  "final_blows",
  "healing_dealt",
  "healing_received",
  "self_healing",
  "damage_taken",
  "damage_blocked",
  "ultimates_earned",
  "ultimates_used",
  "solo_kills",
  "environmental_kills",
];

export function HeroProfile({
  hero,
  timeframe,
  date,
  scrims,
  stats,
  kills,
  deaths,
}: {
  hero: HeroName;
  timeframe: Timeframe;
  date: DateRange | undefined;
  scrims: Record<Timeframe, Scrim[]>;
  stats: PlayerStat[];
  kills: Kill[];
  deaths: Kill[];
}) {
  const t = useTranslations("statsPage.heroStats");
  const heroNames = useHeroNames();

  const [customScrims, setCustomScrims] = useState<Scrim[]>([]);
  const [selectedStat, setSelectedStat] = useState<StatKey>("eliminations");

  useEffect(() => {
    if (timeframe === "custom") {
      const from = date?.from;
      const to = date?.to;
      if (from && to) {
        setCustomScrims(
          scrims["all-time"].filter((s) => s.date >= from && s.date <= to)
        );
      }
    }
  }, [timeframe, date, scrims]);

  const activeScrims =
    timeframe === "custom" ? customScrims : scrims[timeframe];
  const scrimIds = useMemo(
    () => new Set(activeScrims.map((s) => s.id)),
    [activeScrims]
  );

  const filteredStats = useMemo(
    () => stats.filter((s) => scrimIds.has(s.scrimId)),
    [stats, scrimIds]
  );
  const filteredKills = useMemo(
    () => kills.filter((k) => scrimIds.has(k.scrimId)),
    [kills, scrimIds]
  );
  const filteredDeaths = useMemo(
    () => deaths.filter((d) => scrimIds.has(d.scrimId)),
    [deaths, scrimIds]
  );
  const csrLeaderboard = useMemo(
    () => buildHeroTalentLeaderboard(filteredStats, hero),
    [filteredStats, hero]
  );

  const identity = useMemo(() => {
    const games = filteredStats.length;
    const totalKills = filteredKills.length;
    const totalDeaths = filteredDeaths.length;
    const kd =
      totalDeaths > 0
        ? (totalKills / totalDeaths).toFixed(2)
        : totalKills > 0
          ? totalKills.toFixed(2)
          : "—";
    return { games, totalKills, totalDeaths, kd };
  }, [filteredStats, filteredKills, filteredDeaths]);

  const topPerformances = useMemo(
    () =>
      [...filteredStats]
        .filter((s) => s.final_blows > 0)
        .sort((a, b) => b.final_blows - a.final_blows)
        .slice(0, 3),
    [filteredStats]
  );

  const top3Killed = useMemo(
    () => topHeroes(filteredKills.map((k) => k.victim_hero)),
    [filteredKills]
  );
  const top3DiedTo = useMemo(
    () => topHeroes(filteredDeaths.map((d) => d.attacker_hero)),
    [filteredDeaths]
  );

  const heroLabel = heroNames.get(toHero(hero)) ?? hero;
  const role = heroRoleMapping[hero];
  const scopeNote = useMemo(
    () => buildScopeNote(t, timeframe, scrims, customScrims, date),
    [t, timeframe, scrims, customScrims, date]
  );

  return (
    <main className="min-h-[60vh] space-y-10">
      <section aria-labelledby="hero-overview">
        <SectionHeader
          id="hero-overview"
          title={t("sections.overview")}
          description={scopeNote}
        />
        <StatPanel>
          <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-[auto_1fr]">
            <div className="bg-card flex items-center gap-4 px-5 py-4">
              <Image
                src={`/heroes/${toHero(hero)}.png`}
                alt=""
                width={256}
                height={256}
                className="ring-foreground/10 size-16 rounded-md object-cover ring-1"
              />
              <div className="flex flex-col">
                <span className="text-base font-semibold">{heroLabel}</span>
                <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                  {role}
                </span>
              </div>
            </div>
            <StatGrid>
              <StatBlock
                label={t("identity.games")}
                value={identity.games.toLocaleString()}
              />
              <StatBlock
                label={t("identity.totalKills")}
                value={identity.totalKills.toLocaleString()}
              />
              <StatBlock
                label={t("identity.totalDeaths")}
                value={identity.totalDeaths.toLocaleString()}
              />
              <StatBlock label={t("identity.kd")} value={identity.kd} />
            </StatGrid>
          </div>
        </StatPanel>
      </section>

      <section aria-labelledby="hero-talent">
        <SectionHeader
          id="hero-talent"
          title={t("sections.talent")}
          description={t("talent.description")}
        />
        <StatPanel>
          <TalentPanel hero={hero} leaderboard={csrLeaderboard} />
        </StatPanel>
      </section>

      <section aria-labelledby="hero-form">
        <SectionHeader id="hero-form" title={t("sections.form")} />
        <StatPanel>
          <PanelGrid cols={2}>
            <ChartCell title={t("avgHeroDmgDealtPer10.title")}>
              <StatPer10Chart
                stat="hero_damage_dealt"
                data={filteredStats}
                scrimData={activeScrims}
                better="higher"
              />
            </ChartCell>
            <ChartCell title={t("avgDeathPer10.title")}>
              <StatPer10Chart
                stat="deaths"
                data={filteredStats}
                scrimData={activeScrims}
                better="lower"
              />
            </ChartCell>
          </PanelGrid>
        </StatPanel>
        <div className="mt-3">
          <StatPanel>
            <PanelGrid cols={1}>
              <ChartCell
                title={t("stats.title")}
                action={
                  <Select
                    value={selectedStat}
                    onValueChange={(val: StatKey) => setSelectedStat(val)}
                  >
                    <SelectTrigger className="h-8 w-[200px]">
                      <SelectValue placeholder={t("stats.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {STAT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {t(`stats.${opt}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              >
                <StatPer10Chart
                  stat={selectedStat}
                  data={filteredStats}
                  scrimData={activeScrims}
                  better="higher"
                />
              </ChartCell>
            </PanelGrid>
          </StatPanel>
        </div>
      </section>

      <section aria-labelledby="hero-combat">
        <SectionHeader id="hero-combat" title={t("sections.combat")} />
        <StatPanel>
          <PanelGrid cols={2}>
            <ChartCell title={t("finalBlowsByMethod")}>
              <KillMethodChart data={filteredKills} />
            </ChartCell>
            <BestPerformanceCell
              title={t("bestPerformance.title")}
              valueLabel={t("bestPerformance.finalBlows")}
              hero={hero}
              entries={topPerformances.map((s) => ({
                player: s.player_name,
                value: s.final_blows,
              }))}
              emptyMessage={t("bestPerformance.noData")}
            />
          </PanelGrid>
        </StatPanel>
        <div className="mt-3">
          <StatPanel>
            <PanelGrid cols={2}>
              <HeroLeaderboardCell
                title={t("heroesElimMost.title")}
                valueLabel={t("heroesElimMost.eliminations")}
                rows={top3Killed.map(([h, count]) => ({
                  hero: h as HeroName,
                  value: count,
                }))}
                emptyMessage={t("heroesElimMost.noData")}
              />
              <HeroLeaderboardCell
                title={t("heroesDiedToMost.title")}
                valueLabel={t("heroesDiedToMost.deaths")}
                rows={top3DiedTo.map(([h, count]) => ({
                  hero: h as HeroName,
                  value: count,
                }))}
                emptyMessage={t("heroesDiedToMost.noData")}
              />
            </PanelGrid>
          </StatPanel>
        </div>
      </section>
    </main>
  );
}

function PanelGrid({
  cols,
  children,
}: {
  cols: 1 | 2 | 3;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-border grid gap-px",
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-1 lg:grid-cols-2",
        cols === 3 && "grid-cols-1 md:grid-cols-3"
      )}
    >
      {children}
    </div>
  );
}

function ChartCell({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-card flex flex-col px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          {title}
        </h3>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function HeroLeaderboardCell({
  title,
  valueLabel,
  rows,
  emptyMessage,
}: {
  title: string;
  valueLabel: string;
  rows: { hero: HeroName; value: number }[];
  emptyMessage: string;
}) {
  const heroNames = useHeroNames();

  return (
    <div className="bg-card flex flex-col px-5 py-5">
      <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
        {title}
      </h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {rows.length === 0
          ? Array.from({ length: 3 }).map((_, idx) => (
              <li
                // oxlint-disable-next-line react/no-array-index-key
                key={`empty-${idx}`}
                className="text-muted-foreground/60 flex items-center gap-3 text-sm"
              >
                <span className="text-muted-foreground/60 inline-flex w-6 justify-end font-mono text-xs tabular-nums">
                  {(idx + 1).toString().padStart(2, "0")}
                </span>
                <span className="size-9 rounded-md border border-dashed" />
                <span>{emptyMessage}</span>
              </li>
            ))
          : rows.map((row, idx) => {
              const heroLabel = heroNames.get(toHero(row.hero)) ?? row.hero;
              const role = heroRoleMapping[row.hero];
              return (
                <li
                  key={`${row.hero}-${row.value}`}
                  className="flex items-center gap-3"
                >
                  <span
                    className={cn(
                      "inline-flex w-6 justify-end font-mono text-xs tabular-nums",
                      idx === 0
                        ? "text-primary font-semibold"
                        : "text-muted-foreground/80"
                    )}
                  >
                    {(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <Image
                    src={`/heroes/${toHero(row.hero)}.png`}
                    alt=""
                    width={256}
                    height={256}
                    className="ring-foreground/10 size-9 shrink-0 rounded-md object-cover ring-1"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {heroLabel}
                    </span>
                    <span className="text-muted-foreground/80 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                      {role}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {row.value.toLocaleString()}
                  </span>
                </li>
              );
            })}
      </ul>
      <span className="text-muted-foreground/60 mt-4 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
        {valueLabel}
      </span>
    </div>
  );
}

function BestPerformanceCell({
  title,
  valueLabel,
  hero,
  entries,
  emptyMessage,
}: {
  title: string;
  valueLabel: string;
  hero: HeroName;
  entries: { player: string; value: number }[];
  emptyMessage: string;
}) {
  return (
    <div className="bg-card flex flex-col px-5 py-5">
      <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
        {title}
      </h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {entries.length === 0
          ? Array.from({ length: 3 }).map((_, idx) => (
              <li
                // oxlint-disable-next-line react/no-array-index-key
                key={`empty-${idx}`}
                className="text-muted-foreground/60 flex items-center gap-3 text-sm"
              >
                <span className="text-muted-foreground/60 inline-flex w-6 justify-end font-mono text-xs tabular-nums">
                  {(idx + 1).toString().padStart(2, "0")}
                </span>
                <span className="size-9 rounded-md border border-dashed" />
                <span>{emptyMessage}</span>
              </li>
            ))
          : entries.map((entry, idx) => (
              <li
                key={`${entry.player}-${entry.value}`}
                className="flex items-center gap-3"
              >
                <span
                  className={cn(
                    "inline-flex w-6 justify-end font-mono text-xs tabular-nums",
                    idx === 0
                      ? "text-primary font-semibold"
                      : "text-muted-foreground/80"
                  )}
                >
                  {(idx + 1).toString().padStart(2, "0")}
                </span>
                <Image
                  src={`/heroes/${toHero(hero)}.png`}
                  alt=""
                  width={256}
                  height={256}
                  className="ring-foreground/10 size-9 shrink-0 rounded-md object-cover ring-1"
                />
                <div className="min-w-0 flex-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={
                          `/stats/${encodeURIComponent(entry.player)}` as Route
                        }
                        target="_blank"
                        className="block truncate text-sm font-medium no-underline"
                      >
                        {entry.player}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>{valueLabel}</TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {entry.value.toLocaleString()}
                </span>
              </li>
            ))}
      </ul>
      <span className="text-muted-foreground/60 mt-4 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
        {valueLabel}
      </span>
    </div>
  );
}

function topHeroes(items: string[]): [string, number][] {
  const counts = items.reduce<Record<string, number>>((acc, hero) => {
    acc[hero] = (acc[hero] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function buildScopeNote(
  t: ReturnType<typeof useTranslations<"statsPage.heroStats">>,
  timeframe: Timeframe,
  scrims: Record<Timeframe, Scrim[]>,
  customScrims: Scrim[],
  date: DateRange | undefined
): string {
  if (timeframe === "custom") {
    if (date?.from && date?.to) {
      return t("identity.scopeCustom", {
        scrims: customScrims.length,
        from: date.from.toLocaleDateString(),
        to: date.to.toLocaleDateString(),
      });
    }
    return t("identity.scopeCustomEmpty");
  }
  if (timeframe === "all-time") {
    return t("identity.scopeAllTime", {
      scrims: scrims["all-time"].length,
    });
  }
  return t("identity.scopeTimeframe", {
    scrims: scrims[timeframe].length,
    timeframe: t(`timeframe.${timeframe}`),
  });
}
