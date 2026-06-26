"use client";

import { SectionHeader } from "@/components/section-header";
import { StatBlock, StatGrid, StatPanel } from "@/components/player/stat-panel";
import { KillMethodChart } from "@/components/stats/player/charts/kill-methods";
import { MapWinsChart } from "@/components/stats/player/charts/map-wins-chart";
import { RolePieChart } from "@/components/stats/player/charts/role-pie-chart";
import { StatPer10Chart } from "@/components/stats/player/charts/stat-per-10";
import { WinsPerMapTypeChart } from "@/components/stats/player/charts/wins-per-map-type";
import { HeroPortfolio } from "@/components/stats/player/hero-portfolio";
import { PerformanceBreakdown } from "@/components/stats/player/performance-breakdown";
import type { Timeframe } from "@/components/stats/player/range-picker";
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
import type { Winrate } from "@/data/scrim/types";
import type { NonMappableStat, Stat } from "@/lib/player-charts";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { Kill, PlayerStat, Scrim } from "@/generated/prisma/browser";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { Route } from "next";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

type StatKey = keyof Omit<Stat, NonMappableStat>;

export function PlayerProfile({
  playerName,
  timeframe,
  date,
  scrims,
  stats,
  heroes,
  kills,
  mapWinrates,
  deaths,
  onToggleHero,
}: {
  playerName: string;
  timeframe: Timeframe;
  date: DateRange | undefined;
  scrims: Record<Timeframe, Scrim[]>;
  stats: PlayerStat[];
  heroes: HeroName[];
  kills: Kill[];
  mapWinrates: Winrate;
  deaths: Kill[];
  onToggleHero: (hero: HeroName) => void;
}) {
  const t = useTranslations("statsPage.playerStats");

  const [customScrims, setCustomScrims] = useState<Scrim[]>([]);
  const [filteredStats, setFilteredStats] = useState<PlayerStat[]>([]);
  const [filteredKills, setFilteredKills] = useState<Kill[]>([]);
  const [filteredWins, setFilteredWins] = useState<Winrate>([]);
  const [filteredDeaths, setFilteredDeaths] = useState<Kill[]>([]);
  const [selectedStat, setSelectedStat] = useState<StatKey>("eliminations");

  useEffect(() => {
    if (timeframe !== "custom" || !date?.from || !date.to) {
      setCustomScrims([]);
      return;
    }

    const { from, to } = date;
    setCustomScrims(
      scrims["all-time"].filter((s) => s.date >= from && s.date <= to)
    );
  }, [timeframe, date, scrims]);

  useEffect(() => {
    const currentScrims =
      timeframe === "custom" ? customScrims : scrims[timeframe];

    let nextStats = stats.filter((stat) =>
      currentScrims.some((scrim) => scrim.id === stat.scrimId)
    );
    let nextKills = kills.filter((kill) =>
      currentScrims.some((scrim) => scrim.id === kill.scrimId)
    );
    let nextDeaths = deaths.filter((death) =>
      currentScrims.some((scrim) => scrim.id === death.scrimId)
    );

    if (heroes.length > 0) {
      nextStats = nextStats.filter((stat) =>
        heroes.includes(stat.player_hero as HeroName)
      );
      nextKills = nextKills.filter((kill) =>
        heroes.includes(kill.attacker_hero as HeroName)
      );
      nextDeaths = nextDeaths.filter((death) =>
        heroes.includes(death.victim_hero as HeroName)
      );
    }

    setFilteredStats(nextStats);
    setFilteredKills(nextKills);
    setFilteredDeaths(nextDeaths);
  }, [heroes, stats, timeframe, scrims, kills, deaths, customScrims]);

  useEffect(() => {
    if (timeframe === "all-time") {
      setFilteredWins(mapWinrates);
    } else if (timeframe === "custom" && (!date?.from || !date.to)) {
      setFilteredWins([]);
    } else {
      setFilteredWins(
        mapWinrates.filter(
          (win) =>
            win.date >= (date?.from ?? new Date()) &&
            win.date <= (date?.to ?? new Date())
        )
      );
    }
  }, [mapWinrates, date, timeframe]);

  const activeScrims =
    timeframe === "custom" ? customScrims : scrims[timeframe];

  const identity = useMemo(
    () => computeIdentity(filteredStats, filteredWins, activeScrims),
    [filteredStats, filteredWins, activeScrims]
  );

  const top3FinalBlows = useMemo(
    () =>
      filteredStats
        .filter((s) => s.final_blows > 0)
        .sort((a, b) => b.final_blows - a.final_blows)
        .slice(0, 3),
    [filteredStats]
  );

  const top3DiedTo = useMemo(
    () =>
      topHeroes(
        filteredDeaths.map((d) => d.attacker_hero),
        3
      ),
    [filteredDeaths]
  );
  const top3Killed = useMemo(
    () =>
      topHeroes(
        filteredKills.map((k) => k.victim_hero),
        3
      ),
    [filteredKills]
  );

  const scopeNote = useMemo(
    () => buildScopeNote(t, timeframe, scrims, customScrims, date),
    [t, timeframe, scrims, customScrims, date]
  );

  return (
    <main className="min-h-[60vh] space-y-10">
      <section aria-labelledby="profile-identity">
        <SectionHeader
          id="profile-identity"
          title={t("sections.overview")}
          description={scopeNote}
        />
        <StatPanel>
          <StatGrid>
            <StatBlock
              label={t("identity.scrims")}
              value={identity.scrims.toLocaleString()}
            />
            <StatBlock
              label={t("identity.games")}
              value={identity.games.toLocaleString()}
            />
            <StatBlock
              label={t("identity.hours")}
              value={identity.hoursLabel}
            />
            <StatBlock
              label={t("identity.winrate")}
              value={identity.winrateLabel}
              sub={
                identity.recordedMaps > 0
                  ? t("identity.winrateSub", {
                      wins: identity.wins,
                      total: identity.recordedMaps,
                    })
                  : null
              }
            />
          </StatGrid>
        </StatPanel>
      </section>

      <section aria-labelledby="profile-heroes">
        <SectionHeader
          id="profile-heroes"
          title={t("heroPortfolio.title")}
          description={t("heroPortfolio.description")}
        />
        <StatPanel>
          <HeroPortfolio
            stats={filteredStats}
            deaths={filteredDeaths}
            selectedHeroes={heroes}
            onToggleHero={onToggleHero}
            emptyMessage={t("heroPortfolio.empty")}
          />
        </StatPanel>
      </section>

      {heroes.length === 1 && (
        <section aria-labelledby="profile-breakdown">
          <SectionHeader
            id="profile-breakdown"
            title={t("sections.breakdown")}
            description={t("performanceBreakdown.description")}
          />
          <StatPanel>
            <PerformanceBreakdown
              playerName={playerName}
              selectedHeroes={heroes}
            />
          </StatPanel>
        </section>
      )}

      <section aria-labelledby="profile-form">
        <SectionHeader id="profile-form" title={t("sections.form")} />
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

      <section aria-labelledby="profile-maps">
        <SectionHeader id="profile-maps" title={t("sections.maps")} />
        <StatPanel>
          <PanelGrid cols={1}>
            <ChartCell title={t("mapWinrates.title")}>
              <MapWinsChart data={filteredWins} />
            </ChartCell>
          </PanelGrid>
        </StatPanel>
        <div className="mt-3">
          <StatPanel>
            <PanelGrid cols={1}>
              <ChartCell title={t("winrateMapType.title")}>
                <WinsPerMapTypeChart data={filteredWins} />
              </ChartCell>
            </PanelGrid>
          </StatPanel>
        </div>
      </section>

      <section aria-labelledby="profile-habits">
        <SectionHeader id="profile-habits" title={t("sections.habits")} />
        <StatPanel>
          <PanelGrid cols={2}>
            <ChartCell title={t("timeSpent.title")}>
              <RolePieChart data={filteredStats} />
            </ChartCell>
            <ChartCell title={t("finalBlowsByMethod.title")}>
              <KillMethodChart data={filteredKills} />
            </ChartCell>
          </PanelGrid>
        </StatPanel>
      </section>

      <section aria-labelledby="profile-combat">
        <SectionHeader id="profile-combat" title={t("sections.combat")} />
        <StatPanel>
          <PanelGrid cols={3}>
            <HeroLeaderboardCell
              title={t("bestPerformance.title")}
              valueLabel={t("bestPerformance.finalBlows")}
              emptyMessage={t("bestPerformance.noData")}
              rows={top3FinalBlows.map((stat) => ({
                hero: stat.player_hero as HeroName,
                value: stat.final_blows,
                href:
                  buildMapHref(activeScrims, stat.scrimId, stat.MapDataId) ??
                  undefined,
              }))}
            />
            <HeroLeaderboardCell
              title={t("heroesElimMost.title")}
              valueLabel={t("heroesElimMost.eliminations")}
              emptyMessage={t("heroesElimMost.noData")}
              rows={top3Killed.map(([hero, count]) => ({
                hero: hero as HeroName,
                value: count,
              }))}
            />
            <HeroLeaderboardCell
              title={t("heroesDiedToMost.title")}
              valueLabel={t("heroesDiedToMost.deaths")}
              emptyMessage={t("heroesDiedToMost.noData")}
              rows={top3DiedTo.map(([hero, count]) => ({
                hero: hero as HeroName,
                value: count,
              }))}
            />
          </PanelGrid>
        </StatPanel>
      </section>
    </main>
  );
}

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
  rows: { hero: HeroName; value: number; href?: string }[];
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
              const heroLabel =
                heroNames.get(toHero(row.hero)) ?? (row.hero as string);
              const role = heroRoleMapping[row.hero];
              const labelEl = (
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {heroLabel}
                  </span>
                  <span className="text-muted-foreground/80 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                    {role}
                  </span>
                </div>
              );

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
                  {row.href ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={row.href as Route}
                          target="_blank"
                          className="min-w-0 flex-1 no-underline"
                        >
                          {labelEl}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>{valueLabel}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="min-w-0 flex-1">{labelEl}</div>
                  )}
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

type Identity = {
  scrims: number;
  games: number;
  hoursLabel: string;
  winrateLabel: string;
  wins: number;
  recordedMaps: number;
};

function computeIdentity(
  stats: PlayerStat[],
  wins: Winrate,
  scrims: Scrim[]
): Identity {
  const games = new Set(stats.map((s) => `${s.scrimId}-${s.MapDataId}`)).size;
  const totalSeconds = stats.reduce((acc, s) => acc + s.hero_time_played, 0);
  const hours = totalSeconds / 3600;
  const hoursLabel =
    hours >= 10 ? `${hours.toFixed(0)}h` : `${hours.toFixed(1)}h`;

  const recordedMaps = wins.length;
  const winsCount = wins.reduce((acc, w) => acc + (w.wins > 0 ? 1 : 0), 0);
  const winrateLabel =
    recordedMaps > 0 ? `${Math.round((winsCount / recordedMaps) * 100)}%` : "—";

  return {
    scrims: scrims.length,
    games,
    hoursLabel,
    winrateLabel,
    wins: winsCount,
    recordedMaps,
  };
}

function topHeroes(items: string[], limit: number): [string, number][] {
  const counts = items.reduce<Record<string, number>>((acc, hero) => {
    acc[hero] = (acc[hero] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function buildMapHref(
  scrims: Scrim[],
  scrimId: number,
  mapId: number | null
): string | null {
  if (mapId === null) return null;
  const scrim = scrims.find((s) => s.id === scrimId);
  if (!scrim || scrim.teamId === null) return null;
  return `/${scrim.teamId}/scrim/${scrimId}/map/${mapId}`;
}

function buildScopeNote(
  t: ReturnType<typeof useTranslations<"statsPage.playerStats">>,
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
