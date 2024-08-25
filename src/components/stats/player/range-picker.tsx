"use client";

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
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Winrate } from "@/data/scrim-dto";
import { cn } from "@/lib/utils";
import { HeroName, roleHeroMapping } from "@/types/heroes";
import { PlayerStatRows } from "@/types/prisma";
import { Kill, Scrim } from "@prisma/client";
import { SelectGroup } from "@radix-ui/react-select";
import { addMonths, addWeeks, addYears, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DateRange } from "react-day-picker";

export type Timeframe =
  | "one-week"
  | "two-weeks"
  | "one-month"
  | "three-months"
  | "six-months"
  | "one-year"
  | "all-time"
  | "custom";

export function RangePicker({
  permissions,
  data,
  stats,
  kills,
  mapWinrates,
  deaths,
}: {
  permissions: { [key: string]: boolean };
  data: Record<Timeframe, Scrim[]>;
  stats: PlayerStatRows;
  kills: Kill[];
  mapWinrates: Winrate;
  deaths: Kill[];
}) {
  const t = useTranslations("statsPage.playerStats.rangePicker");
  const [timeframe, setTimeframe] = useState<Timeframe>("one-week");
  const [date, setDate] = useState<DateRange | undefined>({
    from: addWeeks(new Date(), -1),
    to: new Date(),
  });
  const [hero, setHero] = useState<HeroName | "all">("all");

  function onTimeframeChange(val: Timeframe) {
    setTimeframe(val);

    if (val === "one-week")
      setDate({ from: addWeeks(new Date(), -1), to: new Date() });
    if (val === "two-weeks")
      setDate({ from: addWeeks(new Date(), -2), to: new Date() });
    if (val === "one-month")
      setDate({ from: addMonths(new Date(), -1), to: new Date() });
    if (val === "three-months")
      setDate({ from: addMonths(new Date(), -3), to: new Date() });
    if (val === "six-months")
      setDate({ from: addMonths(new Date(), -6), to: new Date() });
    if (val === "one-year")
      setDate({ from: addYears(new Date(), -1), to: new Date() });
    if (val === "all-time") setDate({ from: undefined, to: undefined });
  }

  return (
    <main className="space-y-2">
      <div className="items-center gap-2 space-y-2 md:flex md:space-y-0">
        <Select onValueChange={onTimeframeChange} defaultValue="one-week">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("selectTime")}</SelectLabel>
              <SelectItem
                value="one-week"
                disabled={!permissions["stats-timeframe-1"]}
              >
                {t("lastWeek")}
              </SelectItem>
              <SelectItem
                value="two-weeks"
                disabled={!permissions["stats-timeframe-1"]}
              >
                {t("last2Weeks")}
              </SelectItem>
              <SelectItem
                value="one-month"
                disabled={!permissions["stats-timeframe-1"]}
              >
                {t("lastMonth")}
              </SelectItem>
              <SelectItem
                value="three-months"
                disabled={!permissions["stats-timeframe-2"]}
              >
                {t("last3Months")}
              </SelectItem>
              <SelectItem
                value="six-months"
                disabled={!permissions["stats-timeframe-2"]}
              >
                {t("last6Months")}
              </SelectItem>
              <SelectItem
                value="one-year"
                disabled={!permissions["stats-timeframe-3"]}
              >
                {t("lastYear")}
              </SelectItem>
              <SelectItem
                value="all-time"
                disabled={!permissions["stats-timeframe-3"]}
              >
                {t("allTime")}
              </SelectItem>
              <SelectItem
                value="custom"
                disabled={!permissions["stats-timeframe-3"]}
              >
                {t("custom")}
              </SelectItem>
            </SelectGroup>
            {!permissions["stats-timeframe-3"] && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>
                    <Link href="/pricing" external>
                      {t("upgrade")}
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
                    <span>Pick a date</span>
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

      <Select
        onValueChange={(val: HeroName) => setHero(val)}
        defaultValue="all"
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Hero" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t("selectHero")}</SelectLabel>
            <SelectItem value="all">{t("allHeroes")}</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>{t("tank.title")}</SelectLabel>
            {roleHeroMapping["Tank"].map((hero) => (
              <SelectItem key={hero} value={hero}>
                {t(`tank.${hero}`)}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>{t("damage.title")}</SelectLabel>
            {roleHeroMapping["Damage"].map((hero) => (
              <SelectItem key={hero} value={hero}>
                {t(`damage.${hero}`)}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>{t("support.title")}</SelectLabel>
            {roleHeroMapping["Support"].map((hero) => (
              <SelectItem key={hero} value={hero}>
                {t(`support.${hero}`)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Statistics
        timeframe={timeframe}
        date={date}
        scrims={data}
        stats={stats}
        hero={hero}
        kills={kills}
        mapWinrates={mapWinrates}
        deaths={deaths}
      />
    </main>
  );
}
