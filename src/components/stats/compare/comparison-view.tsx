"use client";

import { HeroFilter } from "@/components/stats/player/hero-filter";
import type { Timeframe } from "@/components/stats/player/range-picker";
import { Statistics } from "@/components/stats/player/statistics";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Link } from "@/components/ui/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Winrate } from "@/data/scrim/types";
import { cn } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import type { Kill, PlayerStat, Scrim } from "@prisma/client";
import { addMonths, addWeeks, addYears } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

type PlayerData = {
  playerName: string;
  scrims: Record<Timeframe, Scrim[]>;
  stats: PlayerStat[];
  kills: Kill[];
  mapWinrates: Winrate;
  deaths: Kill[];
  permissions: {
    "stats-timeframe-1": boolean;
    "stats-timeframe-2": boolean;
    "stats-timeframe-3": boolean;
  };
};

type ComparisonViewProps = {
  player1Data: PlayerData;
  player2Data: PlayerData;
};

export function ComparisonView({
  player1Data,
  player2Data,
}: ComparisonViewProps) {
  const tRange = useTranslations("statsPage.playerStats.rangePicker");
  const formatter = useFormatter();
  const TODAY = new Date();
  const LAST_WEEK = addWeeks(TODAY, -1);

  const [timeframe, setTimeframe] = useState<Timeframe>("one-week");
  const [date, setDate] = useState<DateRange | undefined>({
    from: LAST_WEEK,
    to: TODAY,
  });
  const [selectedHeroes, setSelectedHeroes] = useState<HeroName[]>([]);

  const permissions = player1Data.permissions;

  function onTimeframeChange(val: Timeframe) {
    setTimeframe(val);

    if (val === "one-week") setDate({ from: addWeeks(TODAY, -1), to: TODAY });
    if (val === "two-weeks") setDate({ from: addWeeks(TODAY, -2), to: TODAY });
    if (val === "one-month") setDate({ from: addMonths(TODAY, -1), to: TODAY });
    if (val === "three-months")
      setDate({ from: addMonths(TODAY, -3), to: TODAY });
    if (val === "six-months")
      setDate({ from: addMonths(TODAY, -6), to: TODAY });
    if (val === "one-year") setDate({ from: addYears(TODAY, -1), to: TODAY });
    if (val === "all-time") setDate({ from: undefined, to: undefined });
  }

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select onValueChange={onTimeframeChange} defaultValue="one-week">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={tRange("selectTime")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{tRange("selectTime")}</SelectLabel>
                <SelectItem
                  value="one-week"
                  disabled={!permissions["stats-timeframe-1"]}
                >
                  {tRange("lastWeek")}
                </SelectItem>
                <SelectItem
                  value="two-weeks"
                  disabled={!permissions["stats-timeframe-1"]}
                >
                  {tRange("last2Weeks")}
                </SelectItem>
                <SelectItem
                  value="one-month"
                  disabled={!permissions["stats-timeframe-1"]}
                >
                  {tRange("lastMonth")}
                </SelectItem>
                <SelectItem
                  value="three-months"
                  disabled={!permissions["stats-timeframe-2"]}
                >
                  {tRange("last3Months")}
                </SelectItem>
                <SelectItem
                  value="six-months"
                  disabled={!permissions["stats-timeframe-2"]}
                >
                  {tRange("last6Months")}
                </SelectItem>
                <SelectItem
                  value="one-year"
                  disabled={!permissions["stats-timeframe-3"]}
                >
                  {tRange("lastYear")}
                </SelectItem>
                <SelectItem
                  value="all-time"
                  disabled={!permissions["stats-timeframe-3"]}
                >
                  {tRange("allTime")}
                </SelectItem>
                <SelectItem
                  value="custom"
                  disabled={!permissions["stats-timeframe-3"]}
                >
                  {tRange("custom")}
                </SelectItem>
              </SelectGroup>
              {!permissions["stats-timeframe-3"] && (
                <>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>
                      <Link href="/pricing" external>
                        {tRange("upgrade")}
                      </Link>
                    </SelectLabel>
                  </SelectGroup>
                </>
              )}
            </SelectContent>
          </Select>

          {timeframe === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {formatter.dateTime(date.from, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        -{" "}
                        {formatter.dateTime(date.to, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </>
                    ) : (
                      formatter.dateTime(date.from, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    )
                  ) : (
                    <span>{tRange("pickDate")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          <HeroFilter
            selectedHeroes={selectedHeroes}
            onSelectionChange={setSelectedHeroes}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-10 gap-y-12 xl:grid-cols-2">
        <PlayerColumn label="Player A" name={player1Data.playerName}>
          <Statistics
            timeframe={timeframe}
            date={date}
            scrims={player1Data.scrims}
            stats={player1Data.stats}
            heroes={selectedHeroes}
            kills={player1Data.kills}
            mapWinrates={player1Data.mapWinrates}
            deaths={player1Data.deaths}
            comparisonView={true}
          />
        </PlayerColumn>

        <PlayerColumn label="Player B" name={player2Data.playerName}>
          <Statistics
            timeframe={timeframe}
            date={date}
            scrims={player2Data.scrims}
            stats={player2Data.stats}
            heroes={selectedHeroes}
            kills={player2Data.kills}
            mapWinrates={player2Data.mapWinrates}
            deaths={player2Data.deaths}
            comparisonView={true}
          />
        </PlayerColumn>
      </div>
    </div>
  );
}

function PlayerColumn({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-6">
      <div className="border-border border-b pb-4">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {label}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{name}</h2>
      </div>
      {children}
    </section>
  );
}
