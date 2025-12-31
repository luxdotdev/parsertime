"use client";

import { HeroFilter } from "@/components/stats/player/hero-filter";
import type { Timeframe } from "@/components/stats/player/range-picker";
import { Statistics } from "@/components/stats/player/statistics";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { Winrate } from "@/data/scrim-dto";
import { cn } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import type { Kill, PlayerStat, Scrim } from "@prisma/client";
import { addMonths, addWeeks, addYears, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("statsPage.compareStats");
  const tRange = useTranslations("statsPage.playerStats.rangePicker");
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("filters")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="items-center gap-2 space-y-2 md:flex md:space-y-0">
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
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
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
              </div>
            )}
          </div>

          <HeroFilter
            selectedHeroes={selectedHeroes}
            onSelectionChange={setSelectedHeroes}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold tracking-tight">
              {player1Data.playerName}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
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
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold tracking-tight">
              {player2Data.playerName}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
