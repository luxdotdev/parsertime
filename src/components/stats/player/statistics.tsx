"use client";

import { KillMethodChart } from "@/components/stats/player/charts/kill-methods";
import { MapWinsChart } from "@/components/stats/player/charts/map-wins-chart";
import { RolePieChart } from "@/components/stats/player/charts/role-pie-chart";
import { StatPer10Chart } from "@/components/stats/player/charts/stat-per-10";
import { WinsPerMapTypeChart } from "@/components/stats/player/charts/wins-per-map-type";
import type { Timeframe } from "@/components/stats/player/range-picker";
import { SectionHeader } from "@/components/stats/team/section-header";
import { Label } from "@/components/ui/label";
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
import type { HeroName } from "@/types/heroes";
import type { Kill, PlayerStat, Scrim } from "@/generated/prisma/browser";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

function ChartTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More info"
          className="text-muted-foreground hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        >
          <InfoCircledIcon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px]">{children}</TooltipContent>
    </Tooltip>
  );
}

function formatRank(idx: number) {
  return String(idx + 1).padStart(2, "0");
}

export function Statistics({
  timeframe,
  date,
  scrims,
  stats,
  heroes,
  kills,
  mapWinrates,
  deaths,
  comparisonView = false,
}: {
  timeframe: Timeframe;
  date: DateRange | undefined;
  scrims: Record<Timeframe, Scrim[]>;
  stats: PlayerStat[];
  heroes: HeroName[];
  kills: Kill[];
  mapWinrates: Winrate;
  deaths: Kill[];
  comparisonView?: boolean;
}) {
  const t = useTranslations("statsPage.playerStats");
  const heroNames = useHeroNames();

  const [customScrims, setCustomScrims] = useState<Scrim[]>([]);
  const [filteredStats, setFilteredStats] = useState<PlayerStat[]>([]);
  const [filteredKills, setFilteredKills] = useState<Kill[]>([]);
  const [filteredWins, setFilteredWins] = useState<Winrate>([]);
  const [filteredDeaths, setFilteredDeaths] = useState<Kill[]>([]);
  const [selectedStat, setSelectedStat] =
    useState<keyof Omit<Stat, NonMappableStat>>("eliminations");

  const activeScrims =
    timeframe === "custom" ? customScrims : scrims[timeframe];

  useEffect(() => {
    if (timeframe !== "custom" || !date?.from || !date.to) {
      setCustomScrims([]);
      return;
    }

    const { from, to } = date;
    setCustomScrims(
      scrims["all-time"].filter(
        (scrim) => scrim.date >= from && scrim.date <= to
      )
    );
  }, [timeframe, date, scrims]);

  useEffect(() => {
    const currentScrims =
      timeframe === "custom" ? customScrims : scrims[timeframe];

    let timeFilteredStats = stats.filter((stat) =>
      currentScrims.some((scrim) => scrim.id === stat.scrimId)
    );
    let timeFilteredKills = kills.filter((kill) =>
      currentScrims.some((scrim) => scrim.id === kill.scrimId)
    );
    let timeFilteredDeaths = deaths.filter((death) =>
      currentScrims.some((scrim) => scrim.id === death.scrimId)
    );

    if (heroes.length > 0) {
      timeFilteredStats = timeFilteredStats.filter((stat) =>
        heroes.includes(stat.player_hero as HeroName)
      );
      timeFilteredKills = timeFilteredKills.filter((kill) =>
        heroes.includes(kill.attacker_hero as HeroName)
      );
      timeFilteredDeaths = timeFilteredDeaths.filter((death) =>
        heroes.includes(death.victim_hero as HeroName)
      );
    }

    setFilteredStats(timeFilteredStats);
    setFilteredKills(timeFilteredKills);
    setFilteredDeaths(timeFilteredDeaths);
  }, [heroes, stats, timeframe, scrims, kills, deaths, customScrims]);

  useEffect(() => {
    if (timeframe === "all-time") {
      setFilteredWins(mapWinrates);
    } else if (timeframe === "custom" && (!date?.from || !date.to)) {
      setFilteredWins([]);
    } else {
      setFilteredWins(
        mapWinrates.filter((win) => {
          return (
            win.date >= (date?.from ?? new Date()) &&
            win.date <= (date?.to ?? new Date())
          );
        })
      );
    }
  }, [mapWinrates, date, timeframe]);

  const top3FinalBlows = filteredStats
    .filter((stat) => stat.final_blows > 0)
    .sort((a, b) => b.final_blows - a.final_blows)
    .map((stat) => ({
      hero: stat.player_hero,
      finalBlows: stat.final_blows,
      scrimId: stat.scrimId,
      mapId: stat.MapDataId,
    }))
    .slice(0, 3);

  const top3MostPlayedHeroes = filteredStats
    .filter((stat) => stat.hero_time_played > 60)
    .map((stat) => stat.player_hero)
    .reduce(
      (acc, hero) => {
        if (!acc[hero]) {
          acc[hero] = 0;
        }

        acc[hero]++;

        return acc;
      },
      {} as Record<string, number>
    );

  const top3MostPlayedHeroesArray = Object.entries(top3MostPlayedHeroes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const top3Length = top3MostPlayedHeroesArray.length;

  const top3MostDiedToHeroes = filteredDeaths
    .map((death) => death.attacker_hero)
    .reduce(
      (acc, hero) => {
        if (!acc[hero]) {
          acc[hero] = 0;
        }

        acc[hero]++;

        return acc;
      },
      {} as Record<string, number>
    );

  const top3MostDiedToHeroesArray = Object.entries(top3MostDiedToHeroes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const top3MostDiedToHeroesLength = top3MostDiedToHeroesArray.length;

  const top3MostKilledHeroes = filteredKills
    .map((kill) => kill.victim_hero)
    .reduce(
      (acc, hero) => {
        if (!acc[hero]) {
          acc[hero] = 0;
        }

        acc[hero]++;

        return acc;
      },
      {} as Record<string, number>
    );

  const top3MostKilledHeroesArray = Object.entries(top3MostKilledHeroes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const top3MostKilledHeroesLength = top3MostKilledHeroesArray.length;

  function buildScrimDescription(timeframeKey: string) {
    if (timeframe !== "custom" && timeframe !== "all-time") {
      return t(`${timeframeKey}.footer1`, {
        scrims: scrims[timeframe].length,
        timeframe: t(`timeframe.${timeframe}`),
      });
    }
    return t(`${timeframeKey}.footer2`, {
      timeframe1:
        timeframe === "custom"
          ? customScrims.length
          : timeframe === "all-time"
            ? scrims["all-time"].length
            : 0,
      timeframe2:
        timeframe === "all-time"
          ? t("timeframe.all-time-data")
          : date?.from && date?.to
            ? `${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`
            : t("timeframe.all-time"),
    });
  }

  function buildMapHref(scrimId: number | null, mapId: number | null) {
    if (!scrimId || !mapId) return null;
    const teamId = activeScrims.find((scrim) => scrim.id === scrimId)?.teamId;
    if (!teamId) return null;
    return `/${teamId}/scrim/${scrimId}/map/${mapId}` as Route;
  }

  return (
    <section className="grid gap-x-8 gap-y-12 lg:grid-cols-12">
      <section
        className={cn(
          "space-y-4 lg:col-span-6",
          comparisonView && "min-h-[400px] lg:col-span-12"
        )}
      >
        <SectionHeader
          eyebrow="Player · Most played"
          title={t("mostPlayed.title")}
          description={buildScrimDescription("mostPlayed")}
        />
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                <th className="w-12 px-4 py-2 text-left font-medium">
                  {t("mostPlayed.rank")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("mostPlayed.hero")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("mostPlayed.games")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {top3MostPlayedHeroesArray.map(([hero, games], idx) => {
                const heroSlug = toHero(hero);
                const displayName = heroNames.get(heroSlug) ?? hero;
                return (
                  <tr
                    // oxlint-disable-next-line react/no-array-index-key
                    key={`${hero}-${games}-${idx}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="text-muted-foreground px-4 py-3 font-mono tabular-nums">
                      {formatRank(idx)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="border-border relative h-9 w-9 shrink-0 overflow-hidden rounded border">
                          <Image
                            src={`/heroes/${heroSlug}.png`}
                            alt={displayName}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="font-medium">{displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {games}
                    </td>
                  </tr>
                );
              })}
              {top3Length < 3 &&
                Array.from({ length: 3 - top3Length }).map((_, idx) => (
                  <tr
                    // oxlint-disable-next-line react/no-array-index-key
                    key={`mp-empty-${idx}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="text-muted-foreground px-4 py-3 font-mono tabular-nums">
                      {formatRank(top3Length + idx)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">—</td>
                    <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                      —
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className={cn(
          "space-y-4 lg:col-span-6",
          comparisonView && "min-h-[400px] lg:col-span-12"
        )}
      >
        <SectionHeader
          eyebrow="Player · Best performance"
          title={t("bestPerformance.title")}
          description={buildScrimDescription("bestPerformance")}
        />
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                <th className="w-12 px-4 py-2 text-left font-medium">
                  {t("bestPerformance.rank")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("bestPerformance.hero")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("bestPerformance.finalBlows")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {top3FinalBlows.map(
                ({ hero, finalBlows, scrimId, mapId }, idx) => {
                  const heroSlug = toHero(hero as HeroName);
                  const displayName = heroNames.get(heroSlug) ?? hero;
                  const mapHref = buildMapHref(scrimId, mapId);
                  return (
                    <tr
                      key={`${hero}-${mapId}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="text-muted-foreground px-4 py-3 font-mono tabular-nums">
                        {formatRank(idx)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="border-border relative h-9 w-9 shrink-0 overflow-hidden rounded border">
                            <Image
                              src={`/heroes/${heroSlug}.png`}
                              alt={displayName}
                              fill
                              className="object-cover"
                            />
                          </div>
                          {mapHref ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  href={mapHref}
                                  target="_blank"
                                  className="hover:text-primary font-medium underline-offset-4 hover:underline"
                                >
                                  {displayName}
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("bestPerformance.clickMap")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="font-medium">{displayName}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {finalBlows}
                      </td>
                    </tr>
                  );
                }
              )}
              {top3FinalBlows.length < 3 &&
                Array.from({ length: 3 - top3FinalBlows.length }).map(
                  (_, idx) => (
                    <tr
                      // oxlint-disable-next-line react/no-array-index-key
                      key={`bp-empty-${idx}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="text-muted-foreground px-4 py-3 font-mono tabular-nums">
                        {formatRank(top3FinalBlows.length + idx)}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">—</td>
                      <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                        —
                      </td>
                    </tr>
                  )
                )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className={cn(
          "space-y-4 lg:col-span-6",
          comparisonView && "min-h-[400px] lg:col-span-12"
        )}
      >
        <SectionHeader
          eyebrow="Player · Hero damage"
          title={t("avgHeroDmgDealtPer10.title")}
          rightSlot={
            <ChartTooltip>
              <p>{t("avgHeroDmgDealtPer10.tooltip")}</p>
            </ChartTooltip>
          }
        />
        <StatPer10Chart
          stat="hero_damage_dealt"
          data={filteredStats}
          scrimData={timeframe === "custom" ? customScrims : scrims[timeframe]}
          better="higher"
        />
      </section>

      <section
        className={cn(
          "space-y-4 lg:col-span-6",
          comparisonView && "min-h-[400px] lg:col-span-12"
        )}
      >
        <SectionHeader
          eyebrow="Player · Death rate"
          title={t("avgDeathPer10.title")}
          rightSlot={
            <ChartTooltip>
              <p>{t("avgDeathPer10.tooltip")}</p>
            </ChartTooltip>
          }
        />
        <StatPer10Chart
          stat="deaths"
          data={filteredStats}
          scrimData={timeframe === "custom" ? customScrims : scrims[timeframe]}
          better="lower"
        />
      </section>

      <section
        className={cn(
          "space-y-4 lg:col-span-4",
          comparisonView && "min-h-[400px] lg:col-span-12"
        )}
      >
        <SectionHeader
          eyebrow="Player · Time on role"
          title={t("timeSpent.title")}
        />
        <RolePieChart data={filteredStats} />
      </section>

      <section
        className={cn(
          "space-y-4 lg:col-span-4",
          comparisonView && "min-h-[400px] lg:col-span-12"
        )}
      >
        <SectionHeader
          eyebrow="Player · Final blow methods"
          title={t("finalBlowsByMethod.title")}
        />
        <KillMethodChart data={filteredKills} />
      </section>

      <section
        className={cn(
          "space-y-4 lg:col-span-4",
          comparisonView && "min-h-[400px] lg:col-span-12"
        )}
      >
        <SectionHeader
          eyebrow="Player · Winrate by mode"
          title={t("winrateMapType.title")}
        />
        <WinsPerMapTypeChart data={filteredWins} />
      </section>

      <section className="space-y-4 lg:col-span-12">
        <SectionHeader
          eyebrow="Player · Map winrates"
          title={t("mapWinrates.title")}
        />
        <MapWinsChart data={filteredWins} />
      </section>

      <section
        className={cn(
          "space-y-4 lg:col-span-6",
          comparisonView && "min-h-[400px] lg:col-span-12"
        )}
      >
        <SectionHeader
          eyebrow="Player · Most dangerous"
          title={t("heroesDiedToMost.title")}
          description={buildScrimDescription("heroesDiedToMost")}
        />
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                <th className="w-12 px-4 py-2 text-left font-medium">
                  {t("heroesDiedToMost.rank")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("heroesDiedToMost.hero")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("heroesDiedToMost.deaths")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {top3MostDiedToHeroesArray.map(([hero, deathCount], idx) => {
                const heroSlug = toHero(hero);
                const displayName = heroNames.get(heroSlug) ?? hero;
                return (
                  <tr
                    // oxlint-disable-next-line react/no-array-index-key
                    key={`${hero}-${deathCount}-${idx}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="text-muted-foreground px-4 py-3 font-mono tabular-nums">
                      {formatRank(idx)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="border-border relative h-9 w-9 shrink-0 overflow-hidden rounded border">
                          <Image
                            src={`/heroes/${heroSlug}.png`}
                            alt={displayName}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="font-medium">{displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {deathCount}
                    </td>
                  </tr>
                );
              })}
              {top3MostDiedToHeroesLength < 3 &&
                Array.from({ length: 3 - top3MostDiedToHeroesLength }).map(
                  (_, idx) => (
                    <tr
                      // oxlint-disable-next-line react/no-array-index-key
                      key={`dt-empty-${idx}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="text-muted-foreground px-4 py-3 font-mono tabular-nums">
                        {formatRank(top3MostDiedToHeroesLength + idx)}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">—</td>
                      <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                        —
                      </td>
                    </tr>
                  )
                )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className={cn(
          "space-y-4 lg:col-span-6",
          comparisonView && "min-h-[400px] lg:col-span-12"
        )}
      >
        <SectionHeader
          eyebrow="Player · Most-killed enemies"
          title={t("heroesElimMost.title")}
          description={buildScrimDescription("heroesElimMost")}
        />
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                <th className="w-12 px-4 py-2 text-left font-medium">
                  {t("heroesElimMost.rank")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("heroesElimMost.hero")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("heroesElimMost.eliminations")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {top3MostKilledHeroesArray.map(([hero, elims], idx) => {
                const heroSlug = toHero(hero);
                const displayName = heroNames.get(heroSlug) ?? hero;
                return (
                  <tr
                    // oxlint-disable-next-line react/no-array-index-key
                    key={`${hero}-${elims}-${idx}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="text-muted-foreground px-4 py-3 font-mono tabular-nums">
                      {formatRank(idx)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="border-border relative h-9 w-9 shrink-0 overflow-hidden rounded border">
                          <Image
                            src={`/heroes/${heroSlug}.png`}
                            alt={displayName}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="font-medium">{displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {elims}
                    </td>
                  </tr>
                );
              })}
              {top3MostKilledHeroesLength < 3 &&
                Array.from({ length: 3 - top3MostKilledHeroesLength }).map(
                  (_, idx) => (
                    <tr
                      // oxlint-disable-next-line react/no-array-index-key
                      key={`em-empty-${idx}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="text-muted-foreground px-4 py-3 font-mono tabular-nums">
                        {formatRank(top3MostKilledHeroesLength + idx)}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">—</td>
                      <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                        —
                      </td>
                    </tr>
                  )
                )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 lg:col-span-12">
        <SectionHeader
          eyebrow="Player · Stat trend"
          title={t("stats.title")}
          rightSlot={
            <Select
              value={selectedStat}
              onValueChange={(val: keyof Omit<Stat, NonMappableStat>) =>
                setSelectedStat(val)
              }
            >
              <div className="flex items-center gap-2">
                <Label htmlFor="stat" className="sr-only">
                  {t("stats.title")}
                </Label>
                <SelectTrigger className="w-[200px]" id="stat">
                  <SelectValue placeholder={t("stats.select")} />
                </SelectTrigger>
              </div>
              <SelectContent>
                <SelectItem value="eliminations">
                  {t("stats.eliminations")}
                </SelectItem>
                <SelectItem value="final_blows">
                  {t("stats.final_blows")}
                </SelectItem>
                <SelectItem value="healing_dealt">
                  {t("stats.healing_dealt")}
                </SelectItem>
                <SelectItem value="healing_received">
                  {t("stats.healing_received")}
                </SelectItem>
                <SelectItem value="self_healing">
                  {t("stats.self_healing")}
                </SelectItem>
                <SelectItem value="damage_taken">
                  {t("stats.damage_taken")}
                </SelectItem>
                <SelectItem value="damage_blocked">
                  {t("stats.damage_blocked")}
                </SelectItem>
                <SelectItem value="ultimates_earned">
                  {t("stats.ultimates_earned")}
                </SelectItem>
                <SelectItem value="ultimates_used">
                  {t("stats.ultimates_used")}
                </SelectItem>
                <SelectItem value="solo_kills">
                  {t("stats.solo_kills")}
                </SelectItem>
                <SelectItem value="environmental_kills">
                  {t("stats.environmental_kills")}
                </SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <StatPer10Chart
          stat={selectedStat}
          data={filteredStats}
          scrimData={timeframe === "custom" ? customScrims : scrims[timeframe]}
          better="higher"
        />
      </section>
    </section>
  );
}
