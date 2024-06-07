"use client";

import { StatPer10Chart } from "@/components/stats/player/charts/stat-per-10";
import { Timeframe } from "@/components/stats/player/range-picker";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, toHero } from "@/lib/utils";
import { HeroName } from "@/types/heroes";
import { PlayerStatRows } from "@/types/prisma";
import { Kill, PlayerStat, Scrim, User } from "@prisma/client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { RolePieChart } from "@/components/stats/player/charts/role-pie-chart";
import { KillMethodChart } from "@/components/stats/player/charts/kill-methods";
import { Winrate } from "@/data/scrim-dto";
import { MapWinsChart } from "@/components/stats/player/charts/map-wins-chart";
import { WinsPerMapTypeChart } from "@/components/stats/player/charts/wins-per-map-type";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NonMappableStat, Stat } from "@/lib/player-charts";
import { Label } from "@/components/ui/label";

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
  user,
  scrims,
  stats,
  hero,
  kills,
  mapWinrates,
  deaths,
}: {
  timeframe: Timeframe;
  date: DateRange | undefined;
  user: User;
  scrims: Record<Timeframe, Scrim[]>;
  stats: PlayerStatRows;
  hero: HeroName | "all";
  kills: Kill[];
  mapWinrates: Winrate;
  deaths: Kill[];
}) {
  const [customScrims, setCustomScrims] = useState<Scrim[]>([]);
  const [filteredStats, setFilteredStats] = useState<PlayerStatRows>([]);
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
          <CardTitle>Most Played Heroes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Hero</TableHead>
                <TableHead>Games</TableHead>
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
                    <TableCell>No data</TableCell>
                    <TableCell>No data</TableCell>
                  </TableRow>
                ))}
            </tbody>
          </Table>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {timeframe !== "custom" && timeframe !== "all-time" ? (
              <>
                Stats collected from {scrims[timeframe].length} scrims in the
                last {timeframe.replace("-", " ")}
              </>
            ) : (
              <>
                Stats collected from{" "}
                {timeframe === "custom"
                  ? customScrims.length
                  : timeframe === "all-time" && scrims["all-time"].length}{" "}
                scrims{" "}
                {timeframe === "all-time"
                  ? "in all time data"
                  : date?.from && date?.to
                    ? `between ${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`
                    : "all time"}
              </>
            )}
          </p>
        </CardFooter>
      </Card>
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>Best Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Hero</TableHead>
                <TableHead>Final Blows</TableHead>
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
                            <p>Click to view map</p>
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
                      <TableCell>No data</TableCell>
                      <TableCell>No data</TableCell>
                    </TableRow>
                  )
                )}
            </tbody>
          </Table>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {timeframe !== "custom" && timeframe !== "all-time" ? (
              <>
                Stats collected from {scrims[timeframe].length} scrims in the
                last {timeframe.replace("-", " ")}
              </>
            ) : (
              <>
                Stats collected from{" "}
                {timeframe === "custom"
                  ? customScrims.length
                  : timeframe === "all-time" && scrims["all-time"].length}{" "}
                scrims{" "}
                {timeframe === "all-time"
                  ? "in all time data"
                  : date?.from && date?.to
                    ? `between ${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`
                    : "all time"}
              </>
            )}
          </p>
        </CardFooter>
      </Card>
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            Average Hero Damage Dealt per 10 (per scrim){" "}
            <ChartTooltip>
              <p>
                The average hero damage dealt per 10 minutes for each scrim.
                Higher is better.
              </p>
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
            Average Deaths per 10 (per scrim){" "}
            <ChartTooltip>
              <p>
                The average number of deaths per 10 minutes for each scrim.
                Lower is better.
              </p>
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
          <CardTitle>Time Spent on Each Role</CardTitle>
        </CardHeader>
        <RolePieChart data={filteredStats} />
      </Card>
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>Final Blows By Method</CardTitle>
        </CardHeader>
        <KillMethodChart data={filteredKills} />
      </Card>
      <Card className="col-span-full xl:col-span-3">
        <CardHeader>
          <CardTitle>Map Winrates</CardTitle>
        </CardHeader>
        <MapWinsChart data={filteredWins} />
      </Card>
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>Winrate By Map Type</CardTitle>
        </CardHeader>
        <WinsPerMapTypeChart data={filteredWins} />
      </Card>
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>Heroes Died To Most</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Hero</TableHead>
                <TableHead>Deaths</TableHead>
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
                    <TableCell>No data</TableCell>
                    <TableCell>No data</TableCell>
                  </TableRow>
                ))}
            </tbody>
          </Table>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {timeframe !== "custom" && timeframe !== "all-time" ? (
              <>
                Stats collected from {scrims[timeframe].length} scrims in the
                last {timeframe.replace("-", " ")}
              </>
            ) : (
              <>
                Stats collected from{" "}
                {timeframe === "custom"
                  ? customScrims.length
                  : timeframe === "all-time" && scrims["all-time"].length}{" "}
                scrims{" "}
                {timeframe === "all-time"
                  ? "in all time data"
                  : date?.from && date?.to
                    ? `between ${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`
                    : "all time"}
              </>
            )}
          </p>
        </CardFooter>
      </Card>
      <Card className="col-span-1 md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>Heroes Eliminated Most</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Hero</TableHead>
                <TableHead>Eliminations</TableHead>
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
                    <TableCell>No data</TableCell>
                    <TableCell>No data</TableCell>
                  </TableRow>
                ))}
            </tbody>
          </Table>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {timeframe !== "custom" && timeframe !== "all-time" ? (
              <>
                Stats collected from {scrims[timeframe].length} scrims in the
                last {timeframe.replace("-", " ")}
              </>
            ) : (
              <>
                Stats collected from{" "}
                {timeframe === "custom"
                  ? customScrims.length
                  : timeframe === "all-time" && scrims["all-time"].length}{" "}
                scrims{" "}
                {timeframe === "all-time"
                  ? "in all time data"
                  : date?.from && date?.to
                    ? `between ${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`
                    : "all time"}
              </>
            )}
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
              <Label htmlFor="stat">Stat</Label>
              <SelectTrigger className="w-[180px]" id="stat">
                <SelectValue placeholder="Select a stat" />
              </SelectTrigger>
            </div>
            <SelectContent>
              <SelectItem value="eliminations">Eliminations</SelectItem>
              <SelectItem value="final_blows">Final Blows</SelectItem>
              <SelectItem value="healing_dealt">Healing Dealt</SelectItem>
              <SelectItem value="healing_received">Healing Received</SelectItem>
              <SelectItem value="self_healing">Self Healing</SelectItem>
              <SelectItem value="damage_taken">Damage Taken</SelectItem>
              <SelectItem value="damage_blocked">Damage Blocked</SelectItem>
              <SelectItem value="ultimates_earned">Ultimates Earned</SelectItem>
              <SelectItem value="ultimates_used">Ultimates Used</SelectItem>
              <SelectItem value="solo_kills">Solo Kills</SelectItem>
              <SelectItem value="environmental_kills">
                Environmental Kills
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
