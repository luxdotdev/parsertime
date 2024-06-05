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
import { PlayerStatRows } from "@/types/prisma";
import { Scrim, User } from "@prisma/client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

export function Statistics({
  timeframe,
  date,
  user,
  scrims,
  stats,
}: {
  timeframe: Timeframe;
  date: DateRange | undefined;
  user: User;
  scrims: Record<Timeframe, Scrim[]>;
  stats: PlayerStatRows;
}) {
  const [customScrims, setCustomScrims] = useState<Scrim[]>([]);
  const [filteredStats, setFilteredStats] = useState<PlayerStatRows>([]);

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

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
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
                <TableRow key={hero}>
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
                Stats collected from {filteredStats.length} scrims in the last{" "}
                {timeframe.replace("-", " ")}
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
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Damage per 10</CardTitle>
        </CardHeader>
        <StatPer10Chart
          stat="hero_damage_dealt"
          data={filteredStats}
          scrimData={timeframe === "custom" ? customScrims : scrims[timeframe]}
          better="higher"
        />
      </Card>
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Deaths per 10</CardTitle>
        </CardHeader>
        <StatPer10Chart
          stat="deaths"
          data={filteredStats}
          scrimData={timeframe === "custom" ? customScrims : scrims[timeframe]}
          better="lower"
        />
      </Card>
    </section>
  );
}
