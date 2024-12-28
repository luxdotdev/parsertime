"use client";

import { KillMethodChart } from "@/components/stats/player/charts/kill-methods";
import { MapWinsChart } from "@/components/stats/player/charts/map-wins-chart";
import { RolePieChart } from "@/components/stats/player/charts/role-pie-chart";
import { StatPer10Chart } from "@/components/stats/player/charts/stat-per-10";
import { WinsPerMapTypeChart } from "@/components/stats/player/charts/wins-per-map-type";
import { Timeframe } from "@/components/stats/player/range-picker";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Winrate } from "@/data/scrim-dto";
import { NonMappableStat, Stat } from "@/lib/player-charts";
import { cn, toHero } from "@/lib/utils";
import { HeroName } from "@/types/heroes";
import { Kill, PlayerStat, Scrim } from "@prisma/client";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

function ChartTooltip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <InfoCircledIcon className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px]">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function Statistics({
  timeframe,
  date,
  scrims,
  stats,
  hero,
  kills,
  mapWinrates,
  deaths,
}: {
  timeframe: Timeframe;
  date: DateRange | undefined;
  scrims: Record<Timeframe, Scrim[]>;
  stats: PlayerStat[];
  hero: HeroName | "all";
  kills: Kill[];
  mapWinrates: Winrate;
  deaths: Kill[];
}) {
  const t = useTranslations("statsPage.playerStats");
  const [customScrims, setCustomScrims] = useState<Scrim[]>([]);
  const [filteredStats, setFilteredStats] = useState<PlayerStat[]>([]);
  const [filteredKills, setFilteredKills] = useState<Kill[]>([]);
  const [filteredWins, setFilteredWins] = useState<Winrate>([]);
  const [filteredDeaths, setFilteredDeaths] = useState<Kill[]>([]);
  const [selectedStat, setSelectedStat] =
    useState<keyof Omit<Stat, NonMappableStat>>("eliminations");

  useEffect(() => {
    if (timeframe === "custom") {
      const from = date?.from;
      const to = date?.to;

      if (from && to) {
        setCustomScrims(
          scrims["all-time"].filter(
            (scrim) => scrim.date >= from && scrim.date <= to
          )
        );
      }
    }
  }, [timeframe, date, scrims]);

  useEffect(() => {
    setFilteredStats(
      stats.filter((stat) => {
        if (timeframe === "one-week") {
          return scrims["one-week"].some((scrim) => scrim.id === stat.scrimId);
        }

        if (timeframe === "two-weeks") {
          return scrims["two-weeks"].some((scrim) => scrim.id === stat.scrimId);
        }

        if (timeframe === "one-month") {
          return scrims["one-month"].some((scrim) => scrim.id === stat.scrimId);
        }

        if (timeframe === "three-months") {
          return scrims["three-months"].some(
            (scrim) => scrim.id === stat.scrimId
          );
        }

        if (timeframe === "six-months") {
          return scrims["six-months"].some(
            (scrim) => scrim.id === stat.scrimId
          );
        }

        if (timeframe === "one-year") {
          return scrims["one-year"].some((scrim) => scrim.id === stat.scrimId);
        }

        if (timeframe === "all-time") {
          return scrims["all-time"].some((scrim) => scrim.id === stat.scrimId);
        }

        if (timeframe === "custom") {
          return customScrims.some((scrim) => scrim.id === stat.scrimId);
        }

        return false;
      })
    );
  }, [timeframe, scrims, stats, customScrims]);

  useEffect(() => {
    if (hero !== "all") {
      setFilteredStats(stats.filter((stat) => stat.player_hero === hero));
      setFilteredKills(kills.filter((kill) => kill.attacker_hero === hero));
      setFilteredDeaths(deaths.filter((death) => death.victim_hero === hero));
    }
    if (hero === "all") {
      setFilteredStats(
        stats.filter((stat) =>
          scrims[timeframe].some((scrim) => scrim.id === stat.scrimId)
        )
      );
      setFilteredKills(
        kills.filter((kill) =>
          scrims[timeframe].some((scrim) => scrim.id === kill.scrimId)
        )
      );
      setFilteredDeaths(
        deaths.filter((death) =>
          scrims[timeframe].some((scrim) => scrim.id === death.scrimId)
        )
      );
    }
  }, [hero, stats, timeframe, scrims, kills, deaths]);

  useEffect(() => {
    setFilteredKills(
      kills.filter((kill) => {
        if (timeframe === "one-week") {
          return scrims["one-week"].some((scrim) => scrim.id === kill.scrimId);
        }

        if (timeframe === "two-weeks") {
          return scrims["two-weeks"].some((scrim) => scrim.id === kill.scrimId);
        }

        if (timeframe === "one-month") {
          return scrims["one-month"].some((scrim) => scrim.id === kill.scrimId);
        }

        if (timeframe === "three-months") {
          return scrims["three-months"].some(
            (scrim) => scrim.id === kill.scrimId
          );
        }

        if (timeframe === "six-months") {
          return scrims["six-months"].some(
            (scrim) => scrim.id === kill.scrimId
          );
        }

        if (timeframe === "one-year") {
          return scrims["one-year"].some((scrim) => scrim.id === kill.scrimId);
        }

        if (timeframe === "all-time") {
          return scrims["all-time"].some((scrim) => scrim.id === kill.scrimId);
        }

        if (timeframe === "custom") {
          return customScrims.some((scrim) => scrim.id === kill.scrimId);
        }

        return false;
      })
    );
  }, [timeframe, kills, scrims, customScrims]);

  useEffect(() => {
    setFilteredDeaths(
      deaths.filter((death) => {
        if (timeframe === "one-week") {
          return scrims["one-week"].some((scrim) => scrim.id === death.scrimId);
        }

        if (timeframe === "two-weeks") {
          return scrims["two-weeks"].some(
            (scrim) => scrim.id === death.scrimId
          );
        }

        if (timeframe === "one-month") {
          return scrims["one-month"].some(
            (scrim) => scrim.id === death.scrimId
          );
        }

        if (timeframe === "three-months") {
          return scrims["three-months"].some(
            (scrim) => scrim.id === death.scrimId
          );
        }

        if (timeframe === "six-months") {
          return scrims["six-months"].some(
            (scrim) => scrim.id === death.scrimId
          );
        }

        if (timeframe === "one-year") {
          return scrims["one-year"].some((scrim) => scrim.id === death.scrimId);
        }

        if (timeframe === "all-time") {
          return scrims["all-time"].some((scrim) => scrim.id === death.scrimId);
        }

        if (timeframe === "custom") {
          return customScrims.some((scrim) => scrim.id === death.scrimId);
        }

        return false;
      })
    );
  }, [timeframe, deaths, scrims, customScrims]);

  useEffect(() => {
    if (timeframe === "all-time") {
      setFilteredWins(mapWinrates);
    } else {
      setFilteredWins(
        mapWinrates.filter((win) => {
          return (
            win.date >= (date?.from || new Date()) &&
            win.date <= (date?.to || new Date())
          );
        })
      );
    }
  }, [mapWinrates, date, timeframe]);

  const top3FinalBlows = filteredStats
    .filter((stat) => stat.final_blows > 0)
    .sort((a, b) => b.final_blows - a.final_blows)
    .map((stat) => [
      stat.player_hero,
      stat.final_blows,
      stat.scrimId,
      stat.MapDataId,
    ])
    .slice(0, 3);

  const top3MostPlayedHeroes = filteredStats
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

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>{t("mostPlayed.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("mostPlayed.rank")}</TableHead>
                <TableHead>{t("mostPlayed.hero")}</TableHead>
                <TableHead>{t("mostPlayed.games")}</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {top3MostPlayedHeroesArray.map(([hero, games], idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <TableRow key={`${hero}-${games}-${idx}`}>
                  <TableCell>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className={cn(
                        "h-4 w-4",
                        idx === 0
                          ? "text-amber-400"
                          : idx === 1
                            ? "text-gray-400"
                            : idx === 2
                              ? "text-amber-900"
                              : "text-muted-foreground"
                      )}
                    >
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center space-x-2">
                      <div className="pr-2">
                        <Image
                          src={`/heroes/${toHero(hero)}.png`}
                          alt=""
                          width={256}
                          height={256}
                          className={cn(
                            "h-8 w-8 rounded border-2",
                            idx === 0
                              ? "border-amber-400"
                              : idx === 1
                                ? "border-gray-400"
                                : idx === 2
                                  ? "border-amber-900"
                                  : "border-muted-foreground"
                          )}
                        />{" "}
                      </div>
                      {hero}
                    </span>
                  </TableCell>
                  <TableCell>{games}</TableCell>
                </TableRow>
              ))}
              {top3Length < 3 &&
                Array.from({ length: 3 - top3Length }).map((_, idx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <TableRow key={idx}>
                    <TableCell>-</TableCell>
                    <TableCell>{t("mostPlayed.noData")}</TableCell>
                    <TableCell>{t("mostPlayed.noData")}</TableCell>
                  </TableRow>
                ))}
            </tbody>
          </Table>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {timeframe !== "custom" && timeframe !== "all-time"
              ? t("mostPlayed.footer1", {
                  scrims: scrims[timeframe].length,
                  timeframe: t(`timeframe.${timeframe}`),
                })
              : t("mostPlayed.footer2", {
                  timeframe1:
                    timeframe === "custom"
                      ? customScrims.length
                      : timeframe === "all-time" && scrims["all-time"].length,
                  timeframe2:
                    timeframe === "all-time"
                      ? t("timeframe.all-time-data")
                      : date?.from && date?.to
                        ? `${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`
                        : t("timeframe.all-time"),
                })}
          </p>
        </CardFooter>
      </Card>
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>{t("bestPerformance.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("bestPerformance.rank")}</TableHead>
                <TableHead>{t("bestPerformance.hero")}</TableHead>
                <TableHead>{t("bestPerformance.finalBlows")}</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {top3FinalBlows.map(([hero, finalBlows, scrimId, mapId], idx) => (
                <TableRow key={`${hero}-${mapId}`}>
                  <TableCell>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className={cn(
                        "h-4 w-4",
                        idx === 0
                          ? "text-amber-400"
                          : idx === 1
                            ? "text-gray-400"
                            : idx === 2
                              ? "text-amber-900"
                              : "text-muted-foreground"
                      )}
                    >
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center space-x-2">
                      <div className="pr-2">
                        <Image
                          src={`/heroes/${toHero(hero as HeroName)}.png`}
                          alt=""
                          width={256}
                          height={256}
                          className={cn(
                            "h-8 w-8 rounded border-2",
                            idx === 0
                              ? "border-amber-400"
                              : idx === 1
                                ? "border-gray-400"
                                : idx === 2
                                  ? "border-amber-900"
                                  : "border-muted-foreground"
                          )}
                        />{" "}
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/${
                                scrims[timeframe].find(
                                  (scrim) => scrim.id === scrimId
                                )?.teamId
                              }/scrim/${scrimId}/map/${mapId}`}
                              target="_blank"
                            >
                              {hero}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("bestPerformance.clickMap")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                  </TableCell>
                  <TableCell>{finalBlows}</TableCell>
                </TableRow>
              ))}
              {top3FinalBlows.length < 3 &&
                Array.from({ length: 3 - top3FinalBlows.length }).map(
                  (_, idx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <TableRow key={idx}>
                      <TableCell>-</TableCell>
                      <TableCell>{t("bestPerformance.noData")}</TableCell>
                      <TableCell>{t("bestPerformance.noData")}</TableCell>
                    </TableRow>
                  )
                )}
            </tbody>
          </Table>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {timeframe !== "custom" && timeframe !== "all-time"
              ? t("bestPerformance.footer1", {
                  scrims: scrims[timeframe].length,
                  timeframe: t(`timeframe.${timeframe}`),
                })
              : t("bestPerformance.footer2", {
                  timeframe1:
                    timeframe === "custom"
                      ? customScrims.length
                      : timeframe === "all-time" && scrims["all-time"].length,
                  timeframe2:
                    timeframe === "all-time"
                      ? t("timeframe.all-time-data")
                      : date?.from && date?.to
                        ? `${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`
                        : t("timeframe.all-time"),
                })}
          </p>
        </CardFooter>
      </Card>
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            {t("avgHeroDmgDealtPer10.title")}{" "}
            <ChartTooltip>
              <p>{t("avgHeroDmgDealtPer10.tooltip")}</p>
            </ChartTooltip>
          </CardTitle>
        </CardHeader>
        <StatPer10Chart
          stat="hero_damage_dealt"
          data={filteredStats}
          scrimData={timeframe === "custom" ? customScrims : scrims[timeframe]}
          better="higher"
        />
      </Card>
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            {t("avgDeathPer10.title")}{" "}
            <ChartTooltip>
              <p>{t("avgDeathPer10.tooltip")}</p>
            </ChartTooltip>
          </CardTitle>
        </CardHeader>
        <StatPer10Chart
          stat="deaths"
          data={filteredStats}
          scrimData={timeframe === "custom" ? customScrims : scrims[timeframe]}
          better="lower"
        />
      </Card>
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>{t("timeSpent.title")}</CardTitle>
        </CardHeader>
        <RolePieChart data={filteredStats} />
      </Card>
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>{t("finalBlowsByMethod.title")}</CardTitle>
        </CardHeader>
        <KillMethodChart data={filteredKills} />
      </Card>
      <Card className="col-span-full xl:col-span-3">
        <CardHeader>
          <CardTitle>{t("mapWinrates.title")}</CardTitle>
        </CardHeader>
        <MapWinsChart data={filteredWins} />
      </Card>
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>{t("winrateMapType.title")}</CardTitle>
        </CardHeader>
        <WinsPerMapTypeChart data={filteredWins} />
      </Card>
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>{t("heroesDiedToMost.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("heroesDiedToMost.rank")}</TableHead>
                <TableHead>{t("heroesDiedToMost.hero")}</TableHead>
                <TableHead>{t("heroesDiedToMost.deaths")}</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {top3MostDiedToHeroesArray.map(([hero, deaths], idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <TableRow key={`${hero}-${deaths}-${idx}`}>
                  <TableCell>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className={cn(
                        "h-4 w-4",
                        idx === 0
                          ? "text-amber-400"
                          : idx === 1
                            ? "text-gray-400"
                            : idx === 2
                              ? "text-amber-900"
                              : "text-muted-foreground"
                      )}
                    >
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center space-x-2">
                      <div className="pr-2">
                        <Image
                          src={`/heroes/${toHero(hero)}.png`}
                          alt=""
                          width={256}
                          height={256}
                          className={cn(
                            "h-8 w-8 rounded border-2",
                            idx === 0
                              ? "border-amber-400"
                              : idx === 1
                                ? "border-gray-400"
                                : idx === 2
                                  ? "border-amber-900"
                                  : "border-muted-foreground"
                          )}
                        />{" "}
                      </div>
                      {hero}
                    </span>
                  </TableCell>
                  <TableCell>{deaths}</TableCell>
                </TableRow>
              ))}
              {top3MostDiedToHeroesLength < 3 &&
                Array.from({ length: 3 - top3Length }).map((_, idx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <TableRow key={idx}>
                    <TableCell>-</TableCell>
                    <TableCell>{t("heroesDiedToMost.noData")}</TableCell>
                    <TableCell>{t("heroesDiedToMost.noData")}</TableCell>
                  </TableRow>
                ))}
            </tbody>
          </Table>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {timeframe !== "custom" && timeframe !== "all-time"
              ? t("heroesDiedToMost.footer1", {
                  scrims: scrims[timeframe].length,
                  timeframe: t(`timeframe.${timeframe}`),
                })
              : t("heroesDiedToMost.footer2", {
                  timeframe1:
                    timeframe === "custom"
                      ? customScrims.length
                      : timeframe === "all-time" && scrims["all-time"].length,
                  timeframe2:
                    timeframe === "all-time"
                      ? t("timeframe.all-time-data")
                      : date?.from && date?.to
                        ? `${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`
                        : t("timeframe.all-time"),
                })}
          </p>
        </CardFooter>
      </Card>
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>{t("heroesElimMost.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("heroesElimMost.rank")}</TableHead>
                <TableHead>{t("heroesElimMost.hero")}</TableHead>
                <TableHead>{t("heroesElimMost.eliminations")}</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {top3MostKilledHeroesArray.map(([hero, elims], idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <TableRow key={`${hero}-${elims}-${idx}`}>
                  <TableCell>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className={cn(
                        "h-4 w-4",
                        idx === 0
                          ? "text-amber-400"
                          : idx === 1
                            ? "text-gray-400"
                            : idx === 2
                              ? "text-amber-900"
                              : "text-muted-foreground"
                      )}
                    >
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center space-x-2">
                      <div className="pr-2">
                        <Image
                          src={`/heroes/${toHero(hero)}.png`}
                          alt=""
                          width={256}
                          height={256}
                          className={cn(
                            "h-8 w-8 rounded border-2",
                            idx === 0
                              ? "border-amber-400"
                              : idx === 1
                                ? "border-gray-400"
                                : idx === 2
                                  ? "border-amber-900"
                                  : "border-muted-foreground"
                          )}
                        />{" "}
                      </div>
                      {hero}
                    </span>
                  </TableCell>
                  <TableCell>{elims}</TableCell>
                </TableRow>
              ))}
              {top3MostKilledHeroesLength < 3 &&
                Array.from({ length: 3 - top3Length }).map((_, idx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <TableRow key={idx}>
                    <TableCell>-</TableCell>
                    <TableCell>{t("heroesElimMost.noData")}</TableCell>
                    <TableCell>{t("heroesElimMost.noData")}</TableCell>
                  </TableRow>
                ))}
            </tbody>
          </Table>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {timeframe !== "custom" && timeframe !== "all-time"
              ? t("heroesElimMost.footer1", {
                  scrims: scrims[timeframe].length,
                  timeframe: t(`timeframe.${timeframe}`),
                })
              : t("heroesElimMost.footer2", {
                  timeframe1:
                    timeframe === "custom"
                      ? customScrims.length
                      : timeframe === "all-time" && scrims["all-time"].length,
                  timeframe2:
                    timeframe === "all-time"
                      ? t("timeframe.all-time-data")
                      : date?.from && date?.to
                        ? `${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`
                        : t("timeframe.all-time"),
                })}
          </p>
        </CardFooter>
      </Card>
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <Select
            value={selectedStat}
            onValueChange={(val: keyof Omit<Stat, NonMappableStat>) =>
              setSelectedStat(val)
            }
          >
            <div className="flex items-center gap-2">
              <Label htmlFor="stat">{t("stats.title")}</Label>
              <SelectTrigger className="w-[180px]" id="stat">
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
        </CardHeader>
        <StatPer10Chart
          stat={selectedStat}
          data={filteredStats}
          scrimData={timeframe === "custom" ? customScrims : scrims[timeframe]}
          better="higher"
        />
      </Card>
    </section>
  );
}
